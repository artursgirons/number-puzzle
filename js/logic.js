$(document).ready(function () {
    ko.applyBindings(GameVM.Init());
});

if (!Array.indexOf) {
    Array.prototype.indexOf = function (obj, start) {
        for (var i = (start || 0); i < this.length; i++) {
            if (this[i] == obj) {
                return i;
            }
        }
        return -1;
    }
}

if (!Date.prototype.toISOTimeString) {
    Date.prototype.toISOTimeString = (function () {
        function p(n) { return (n < 10 ? '0' : '') + n; }
        return function () {
            return p(this.getUTCHours()) + ':' + p(this.getUTCMinutes()) + ':' + p(this.getUTCSeconds())
        }
    }());
}

var GameVM = (function () {
    var ModelExtended = function () {
        var levels = [
            {
                id: 0,
                name: '0. Tutorial',
                columns: 3,
                map: [
                    [1, 1, 2],
                    [5, 3, 8],
                    [4, 3, 4]
                ]
            },
            {
                id: 1,
                name: '1. First challenge',
                columns: 9,
                map: [
                    [0, 2, 3, 4, 8, 0, 0, 0, 0],
                    [0, 0, 2, 3, 4, 7, 0, 0, 0],
                    [0, 0, 0, 2, 4, 4, 2, 0, 0],
                    [0, 0, 0, 0, 8, 3, 4, 5, 0]
                ]
            },
            {
                id: 2,
                name: '2. Original puzzle',
                columns: 9,
                map: [
                    [1, 2, 3, 4, 5, 6, 7, 8, 9],
                    [1, 1, 1, 2, 1, 3, 1, 4, 1],
                    [5, 1, 6, 1, 7, 1, 8, 1, 9]
                ]
            },
            {
                id: 3,
                name: '3. Stars',
                columns: 9,
                map: [
                    [9, 0, 0, 0, 0, 0, 0, 9, 1],
                    [1, 0, 0, 9, 4, 0, 0, 0, 0],
                    [0, 0, 0, 6, 1, 5, 0, 0, 0],
                    [0, 0, 2, 1, 0, 3, 4, 3, 0],
                    [0, 2, 1, 0, 9, 0, 1, 3, 0],
                    [0, 7, 8, 5, 0, 5, 6, 0, 0],
                    [0, 0, 0, 8, 1, 4, 0, 0, 0],
                    [0, 0, 0, 0, 6, 1, 0, 0, 1],
                    [9, 1, 0, 0, 0, 0, 0, 0, 1]
                ]
            },
            {
                id: 100,
                name: 'Bonus: Random',
                columns: 9,
                map: null
            }
        ];

        var rndMapId = 100;

        var self = this;

        var ItemsModel = function (value, x, y) {
            this.x = x;
            this.y = y;
            this.value = ko.observable(value);
            this.isSelected = ko.observable(false);
            this.isClosed = ko.observable(value == 0);
            this.onItemClick = function () {
                self.OnItemSelected(this);
            }
        }

        var RowsModel = function () {
            this.show = ko.observable(true);
            this.items = ko.observableArray();
            this.Hide = function () {
                var currentRow = this.items();
                var isRowOK = true;
                for (var t = 0; t < levels[self.level()].columns; t++) {
                    if (!currentRow[t].isClosed()) {
                        isRowOK = false;
                        break;
                    }
                }
                if (isRowOK) {
                    self.stats().rowsDeleted(self.stats().rowsDeleted() + 1);
                    this.show(false);
                }
            }
        }

        var StatsModel = function () {
            this.additionPairs = ko.observable(0);
            this.equalityPairs = ko.observable(0);
            this.totalPairs = ko.computed(function () { return this.additionPairs() + this.equalityPairs(); }, this);
            this.time = ko.observable();
            this.timeLiteral = ko.observable("00:00:00");
            this.nrOfAdds = ko.observable(0);
            this.nrTotalRows = ko.observable();
            this.rowsDeleted = ko.observable(0);
            this.level = ko.observable(0);

            this.time(new Date().getTime());
            this.intervalTimer = setInterval("GameVM.stats().onTimerElapsed()", 1000);

            this.onTimerElapsed = function () {
                var dt = new Date();
                dt.setTime(new Date().getTime() - GameVM.stats().time());
                GameVM.stats().timeLiteral(dt.toISOTimeString());
            };

            this.Clear = function (level) {
                if (typeof (level) === 'undefined') {
                    this.level(0);
                }
                else {
                    this.level(level);
                }
                this.additionPairs(0);
                this.equalityPairs(0);
                this.time(new Date().getTime());
                this.nrOfAdds(0);
                this.nrTotalRows(levels[this.level()].map.length);
                this.rowsDeleted(0);
                this.timeLiteral("00:00:00");
                window.clearInterval(this.intervalTimer);
                this.intervalTimer = window.setInterval("GameVM.stats().onTimerElapsed()", 1000);
            };

            this.Stop = function () {
                window.clearInterval(this.intervalTimer);
            }
        }

        $.extend(self, {
            levels: ko.observableArray(levels),
            level: ko.observable(),
            selectedLevel: ko.observable()
        });

        $.extend(self, {
            rows: ko.observableArray(),
            selected: null,
            linear: [],
            loginId: ko.observable(null),
            stats: ko.observable(new StatsModel()),

            Init: function (level) {

                var params = {};
                var queryString = location.hash.substring(1);
                var regex = /([^&=]+)=([^&]*)/g;
                var m;

                while (m = regex.exec(queryString)) {
                    params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
                }

                //Check Access Heare

                if (params.id) {
                    self.loginId(params.id);
                }

                if (typeof (level) === 'undefined') {
                    self.level(0);
                }
                else {
                    self.level(level);
                }

                self.selectedLevel(levels[self.level()]);

                if (levels[self.level()].id == rndMapId) {
                    self.NewRandomGame();
                }

                self.rows.removeAll();
                self.selected = null;
                self.linear = [];
                if (self.stats() != null) {
                    self.stats().Clear(self.level());
                }

                for (var y = 0; y < levels[self.level()].map.length; y++) {
                    var newRow = ko.observable(new RowsModel());
                    for (var x = 0; x < levels[self.level()].columns; x++) {
                        var newItem = new ItemsModel(levels[self.level()].map[y][x], x, y);
                        newRow().items.push(newItem);
                    }
                    self.rows.push(newRow);
                }

                self.RebuildLinear();
                return self;
            },

            Login: function () {
            },

            Logout: function () {
            },

            OnItemSelected: function (item) {
                if (!item.isClosed()) {
                    if (self.selected == null) {
                        self.selected = item;
                        item.isSelected(true);
                    }
                    else {
                        if (item == self.selected) {
                            item.isSelected(false);
                            self.selected = null;
                        }
                        else {
                            var isOK = false;
                            var isPairEqual = false;
                            if ((self.selected.value() + item.value()) == 10 || item.value() == self.selected.value()) {
                                if (item.value() == self.selected.value()) {
                                    isPairEqual = true;
                                }

                                var index = self.linear.indexOf(item);
                                var indexSelected = self.linear.indexOf(self.selected);

                                if (
                                    indexSelected > index && (indexSelected - index) == 1
                                    || indexSelected < index && (index - indexSelected) == 1
                                  //|| indexSelected == 0 && index == (self.linear.length - 1) || //looping
                                  //|| index == 0 && indexSelected == (self.linear.length - 1) //looping
                                ) {
                                    isOK = true;
                                }

                                if (!isOK) {
                                    if (self.selected.x == item.x) {
                                        var top = null;
                                        var bottom = null;

                                        if (self.selected.y < item.y) {
                                            top = self.selected.y;
                                            bottom = item.y;
                                        }
                                        else {
                                            top = item.y;
                                            bottom = self.selected.y;
                                        }

                                        if ((bottom - top) == 1)
                                            isOK = true;
                                        else {
                                            isOK = false;

                                            /* //looping
                                            isOK = true;
                                            var tmp;

                                            for (var _y = 0; _y < top; _y++) {
                                            tmp = self.rows()[_y]().items()[item.x];
                                            if (!tmp.isClosed() && tmp.value() != null) {
                                            isOK = false;
                                            break;
                                            }
                                            }

                                            for (var _y = bottom + 1; _y < self.rows().length; _y++) {
                                            tmp = self.rows()[_y]().items()[item.x];
                                            if (!tmp.isClosed() && tmp.value() != null) {
                                            isOK = false;
                                            break;
                                            }
                                            }
                                            */

                                            if (!isOK) {
                                                isOK = true;
                                                for (var _y = top + 1; _y < bottom; _y++) {
                                                    if (!self.rows()[_y]().items()[item.x].isClosed()) {
                                                        isOK = false;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if (isOK) {
                                    index = self.linear.indexOf(item);
                                    if (index != -1)
                                        self.linear.splice(index, 1);

                                    indexSelected = self.linear.indexOf(self.selected);
                                    if (indexSelected != -1)
                                        self.linear.splice(indexSelected, 1);

                                    self.selected.isSelected(false);
                                    self.selected.isClosed(true);
                                    self.rows()[self.selected.y]().Hide();

                                    item.isSelected(false);
                                    item.isClosed(true);
                                    self.rows()[item.y]().Hide();

                                    self.selected = null;

                                    if (isPairEqual)
                                        self.stats().equalityPairs(self.stats().equalityPairs() + 1);
                                    else
                                        self.stats().additionPairs(self.stats().additionPairs() + 1);


                                    if (self.linear.length == 0) {
                                        self.stats().Stop();

                                        for (var t = 0; t < self.rows().length; t++) {
                                            self.rows()[t]().show(true);
                                        }

                                        if (self.level() < (levels.length - 1)) {
                                            alert("Congratulations, try next level!");
                                            self.Init(self.level() + 1);
                                        }
                                        else {
                                            alert("Congratulations, Thats it for now!");
                                        }
                                    }
                                }
                            }

                            if (!isOK) {
                                self.selected.isSelected(false);
                                self.selected = null;
                                self.OnItemSelected(item);
                            }
                        }
                    }
                }
            },

            AddNewSet: function () {
                if (self.selected != null) {
                    self.selected.isSelected(false);
                    self.selected = null;
                }

                var lastRowIndex = self.rows().length - 1;
                var lastRow = self.rows()[lastRowIndex]().items();

                for (var u = 0; u < levels[self.level()].columns; u++) {
                    if (lastRow[u].value() == null) {
                        var item = self.ExtractFirstFromLinear();
                        if (item != null) {
                            lastRow[u].value(item.value());
                        }
                        else {
                            break
                        }
                    }
                }

                if (self.linear.length > 0) {

                    var newRow = ko.observable(new RowsModel());
                    for (var x = 0; x < levels[self.level()].columns; x++) {
                        var newItem = new ItemsModel(null, x, lastRowIndex + 1);
                        newRow().items.push(newItem);
                    }

                    self.rows.push(newRow);
                    self.AddNewSet();
                }
                else {
                    self.RebuildLinear();
                    self.stats().nrOfAdds(self.stats().nrOfAdds() + 1);
                }
            },

            ExtractFirstFromLinear: function () {
                if (self.linear.length > 0)
                    return self.linear.shift();
                return null;
            },

            RebuildLinear: function () {
                self.linear = [];
                for (var y = 0; y < self.rows().length; y++) {
                    for (var x = 0; x < levels[self.level()].columns; x++) {
                        var itm = self.rows()[y]().items()[x];
                        if (itm.value() != null && !itm.isClosed()) {
                            self.linear.push(itm);
                        }
                    }
                }
            },

            NewRandomGame: function () {
                var rndLevel;
                var rndIndex;
                for (var i = 0; i < levels.length; i++) {
                    if (levels[i].id == rndMapId) {
                        rndLevel = levels[i];
                        rndIndex = i;
                        break;
                    }
                }

                var tmp = [];
                for (var y = 0; y < 3; y++) {
                    tmp[y] = [];
                    for (var x = 0; x < rndLevel.columns; x++) {
                        tmp[y][x] = Math.floor((Math.random() * 9) + 1);
                    }
                }

                rndLevel.map = tmp;
            },

            NewOriginalGame: function () {
                self.Init();
            },

            Restart: function () {
                self.Init(self.level());
            },

            OnLevelChanged: function () {
                var current = self.selectedLevel();
                if (levels.indexOf(current) >= 0) {
                    self.Init(levels.indexOf(current));
                }
            }
        });
    }

    var vm = new ModelExtended();

    vm.rows.subscribe(function () {
        vm.stats().nrTotalRows(vm.rows().length);
    });

    return vm;
})();
