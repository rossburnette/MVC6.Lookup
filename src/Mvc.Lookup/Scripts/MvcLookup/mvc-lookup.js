﻿/*!
 * Mvc.Lookup 3.0.0
 * https://github.com/NonFactors/MVC6.Lookup
 *
 * Copyright © NonFactors
 *
 * Licensed under the terms of the MIT License
 * http://www.opensource.org/licenses/mit-license.php
 */
var MvcLookupFilter = (function () {
    function MvcLookupFilter(lookup) {
        var group = lookup.group;

        this.lookup = lookup;
        this.sort = group.dataset.sort;
        this.order = group.dataset.order;
        this.search = group.dataset.search;
        this.page = parseInt(group.dataset.page);
        this.rows = parseInt(group.dataset.rows);
        this.additionalFilters = group.dataset.filters.split(',').filter(Boolean);
    }

    MvcLookupFilter.prototype = {
        formUrl: function (search) {
            var url = this.lookup.url.split('?')[0];
            var urlQuery = this.lookup.url.split('?')[1];
            var filter = this.lookup.extend({ ids: [], checkIds: [], selected: [] }, this, search);
            var query = '?' + (urlQuery ? urlQuery + '&' : '') + 'search=' + encodeURIComponent(filter.search);

            for (var i = 0; i < this.additionalFilters.length; i++) {
                var filters = document.querySelectorAll('[name="' + this.additionalFilters[i] + '"]');
                for (var j = 0; j < filters.length; j++) {
                    query += '&' + encodeURIComponent(this.additionalFilters[i]) + '=' + encodeURIComponent(filters[j].value);
                }
            }

            for (i = 0; i < filter.selected.length; i++) {
                query += '&selected=' + encodeURIComponent(filter.selected[i].LookupIdKey);
            }

            for (i = 0; i < filter.checkIds.length; i++) {
                query += '&checkIds=' + encodeURIComponent(filter.checkIds[i].value);
            }

            for (i = 0; i < filter.ids.length; i++) {
                query += '&ids=' + encodeURIComponent(filter.ids[i].value);
            }

            query += '&sort=' + encodeURIComponent(filter.sort) +
                '&order=' + encodeURIComponent(filter.order) +
                '&rows=' + encodeURIComponent(filter.rows) +
                '&page=' + encodeURIComponent(filter.page) +
                '&_=' + Date.now();

            return url + query;
        }
    };

    return MvcLookupFilter;
}());
var MvcLookupDialog = (function () {
    function MvcLookupDialog(lookup) {
        this.lookup = lookup;
        this.title = lookup.group.dataset.title;
        this.instance = document.getElementById(lookup.group.dataset.dialog);
        this.options = { preserveSearch: true, rows: { min: 1, max: 99 }, openDelay: 100 };

        this.overlay = new MvcLookupOverlay(this);
        this.table = this.instance.querySelector('table');
        this.tableHead = this.instance.querySelector('thead');
        this.tableBody = this.instance.querySelector('tbody');
        this.rows = this.instance.querySelector('.mvc-lookup-rows');
        this.pager = this.instance.querySelector('.mvc-lookup-pager');
        this.header = this.instance.querySelector('.mvc-lookup-title');
        this.search = this.instance.querySelector('.mvc-lookup-search');
        this.selector = this.instance.querySelector('.mvc-lookup-selector');
        this.closeButton = this.instance.querySelector('.mvc-lookup-close');
        this.error = this.instance.querySelector('.mvc-lookup-dialog-error');
        this.loader = this.instance.querySelector('.mvc-lookup-dialog-loader');
    }

    MvcLookupDialog.prototype = {
        open: function () {
            var dialog = this;
            var filter = dialog.lookup.filter;
            MvcLookupDialog.prototype.current = this;

            dialog.error.style.display = 'none';
            dialog.loader.style.display = 'none';
            dialog.header.innerText = dialog.title;
            dialog.selected = dialog.lookup.selected.slice();
            dialog.rows.value = dialog.limitRows(filter.rows);
            dialog.error.innerHTML = dialog.lookup.lang['error'];
            dialog.search.placeholder = dialog.lookup.lang['search'];
            dialog.selector.style.display = dialog.lookup.multi ? '' : 'none';
            filter.search = dialog.options.preserveSearch ? filter.search : '';
            dialog.selector.innerText = dialog.lookup.lang['select'].replace('{0}', dialog.lookup.selected.length);

            dialog.bind();
            dialog.refresh();
            dialog.search.value = filter.search;

            setTimeout(function () {
                if (dialog.isLoading) {
                    dialog.loader.style.opacity = 1;
                    dialog.loader.style.display = '';
                }

                dialog.overlay.show();
            }, dialog.options.openDelay);
        },
        close: function () {
            var dialog = MvcLookupDialog.prototype.current;
            dialog.lookup.group.classList.remove('mvc-lookup-error');

            dialog.lookup.stopLoading();
            dialog.overlay.hide();

            if (dialog.lookup.multi) {
                dialog.lookup.select(dialog.selected, true);
                dialog.lookup.search.focus();
            }

            MvcLookupDialog.prototype.current = null;
        },
        refresh: function () {
            var dialog = this;
            dialog.isLoading = true;
            dialog.error.style.opacity = 0;
            dialog.error.style.display = '';
            dialog.loader.style.display = '';
            var loading = setTimeout(function () {
                dialog.loader.style.opacity = 1;
            }, dialog.lookup.options.loadingDelay);

            dialog.lookup.startLoading({ selected: dialog.selected }, function (data) {
                dialog.isLoading = false;
                clearTimeout(loading);
                dialog.render(data);
            }, function () {
                dialog.isLoading = false;
                clearTimeout(loading);
                dialog.render();
            });
        },

        render: function (data) {
            var dialog = this;
            dialog.pager.innerHTML = '';
            dialog.tableBody.innerHTML = '';
            dialog.tableHead.innerHTML = '';
            dialog.loader.style.opacity = 0;
            setTimeout(function () {
                dialog.loader.style.display = 'none';
            }, dialog.lookup.options.loadingDelay);

            if (data) {
                dialog.error.style.display = 'none';

                dialog.renderHeader(data.columns);
                dialog.renderBody(data.columns, data.rows);
                dialog.renderFooter(data.filteredRows);
            } else {
                dialog.error.style.opacity = 1;
            }
        },
        renderHeader: function (columns) {
            var row = document.createElement('tr');

            for (var i = 0; i < columns.length; i++) {
                if (!columns[i].hidden) {
                    row.appendChild(this.createHeaderColumn(columns[i]));
                }
            }

            row.appendChild(document.createElement('th'));
            this.tableHead.appendChild(row);
        },
        renderBody: function (columns, rows) {
            if (!rows.length) {
                var empty = document.createElement('td');
                var row = document.createElement('tr');

                empty.innerHTML = this.lookup.lang['noData'];
                empty.colspan = columns.length + 1;
                row.className = 'mvc-lookup-empty';

                this.tableBody.appendChild(row);
                row.appendChild(empty);
            }

            var hasSplit = false;
            var hasSelection = rows.length && this.lookup.indexOf(this.selected, rows[0].LookupIdKey) >= 0;

            for (var i = 0; i < rows.length; i++) {
                var row = this.createDataRow(rows[i]);
                var selection = document.createElement('td');

                for (var j = 0; j < columns.length; j++) {
                    if (!columns[j].hidden) {
                        var data = document.createElement('td');
                        data.className = columns[j].cssClass || '';
                        data.innerText = rows[i][columns[j].key] || '';

                        row.appendChild(data);
                    }
                }

                row.appendChild(selection);

                if (!hasSplit && hasSelection && this.lookup.indexOf(this.selected, rows[i].LookupIdKey) < 0) {
                    var separator = document.createElement('tr');
                    var empty = document.createElement('td');

                    separator.className = 'mvc-lookup-split';
                    empty.colspan = columns.length + 1;

                    this.tableBody.appendChild(separator);
                    separator.appendChild(empty);

                    hasSplit = true;
                }

                this.tableBody.appendChild(row);
            }
        },
        renderFooter: function (filteredRows) {
            var dialog = this;
            var filter = dialog.lookup.filter;

            dialog.totalRows = filteredRows + dialog.selected.length;
            var totalPages = Math.ceil(filteredRows / filter.rows);
            filter.page = dialog.limitPage(filter.page);

            if (totalPages) {
                var startingPage = Math.floor(filter.page / 4) * 4;

                if (filter.page && 4 < totalPages) {
                    dialog.renderPage('&laquo', 0);
                    dialog.renderPage('&lsaquo;', filter.page - 1);
                }

                for (var i = startingPage; i < totalPages && i < startingPage + 4; i++) {
                    dialog.renderPage(i + 1, i);
                }

                if (4 < totalPages && filter.page < totalPages - 1) {
                    dialog.renderPage('&rsaquo;', filter.page + 1);
                    dialog.renderPage('&raquo;', totalPages - 1);
                }
            } else {
                filter.page = 0;
                dialog.renderPage(1, 0);
            }
        },
        renderPage: function (text, value) {
            var page = document.createElement('button');
            var filter = this.lookup.filter;
            page.type = 'button';
            var dialog = this;

            if (filter.page == value) {
                page.className = 'active';
            }

            page.innerHTML = text;
            page.addEventListener('click', function () {
                if (filter.page != value) {
                    filter.page = dialog.limitPage(value);

                    dialog.refresh();
                }
            });

            dialog.pager.appendChild(page);
        },

        createHeaderColumn: function (column) {
            var header = document.createElement('th');
            var filter = this.lookup.filter;
            var dialog = this;

            if (column.cssClass) {
                header.classList.add(column.cssClass);
            }

            if (filter.sort == column.key) {
                header.classList.add('mvc-lookup-' + filter.order.toLowerCase());
            }

            header.innerText = column.header || '';
            header.addEventListener('click', function () {
                filter.order = filter.sort == column.key && filter.order == 'Asc' ? 'Desc' : 'Asc';
                filter.sort = column.key;

                dialog.refresh();
            });

            return header;
        },
        createDataRow: function (data) {
            var dialog = this;
            var lookup = this.lookup;
            var row = document.createElement('tr');
            if (lookup.indexOf(dialog.selected, data.LookupIdKey) >= 0) {
                row.className = 'selected';
            }

            row.addEventListener('click', function () {
                if (!window.getSelection().isCollapsed) {
                    return;
                }

                var index = lookup.indexOf(dialog.selected, data.LookupIdKey);
                if (index >= 0) {
                    if (lookup.multi) {
                        dialog.selected.splice(index, 1);

                        this.classList.remove('selected');
                    }
                } else {
                    if (lookup.multi) {
                        dialog.selected.push(data);
                    } else {
                        dialog.selected = [data];
                    }

                    this.classList.add('selected');
                }

                if (lookup.multi) {
                    dialog.selector.innerText = dialog.lookup.lang['select'].replace('{0}', dialog.selected.length);
                } else {
                    lookup.select(dialog.selected, true);

                    dialog.close();

                    lookup.search.focus();
                }
            });

            return row;
        },

        limitPage: function (value) {
            value = Math.max(0, value);

            return Math.min(value, Math.ceil((this.totalRows - this.selected.length) / this.lookup.filter.rows) - 1);
        },
        limitRows: function (value) {
            var options = this.options.rows;

            return Math.min(Math.max(parseInt(value), options.min), options.max) || this.lookup.filter.rows;
        },

        bind: function () {
            this.search.removeEventListener('keyup', this.searchChanged);
            this.closeButton.removeEventListener('click', this.close);
            this.rows.removeEventListener('change', this.rowsChanged);
            this.selector.removeEventListener('click', this.close);

            this.search.addEventListener('keyup', this.searchChanged);
            this.closeButton.addEventListener('click', this.close);
            this.rows.addEventListener('change', this.rowsChanged);
            this.selector.addEventListener('click', this.close);
        },
        rowsChanged: function () {
            var dialog = MvcLookupDialog.prototype.current;
            var rows = dialog.limitRows(this.value);
            this.value = rows;

            if (dialog.lookup.filter.rows != rows) {
                dialog.lookup.filter.rows = rows;
                dialog.lookup.filter.page = 0;

                dialog.refresh();
            }
        },
        searchChanged: function (e) {
            var input = this;
            var dialog = MvcLookupDialog.prototype.current;

            dialog.lookup.stopLoading();
            clearTimeout(dialog.searching);
            dialog.searching = setTimeout(function () {
                if (dialog.lookup.filter.search != input.value || e.keyCode == 13) {
                    dialog.lookup.filter.search = input.value;
                    dialog.lookup.filter.page = 0;

                    dialog.refresh();
                }
            }, dialog.lookup.options.searchDelay);
        }
    };

    return MvcLookupDialog;
}());
var MvcLookupOverlay = (function () {
    function MvcLookupOverlay(dialog) {
        this.instance = this.getClosestOverlay(dialog.instance);
        this.dialog = dialog;

        this.bind();
    }

    MvcLookupOverlay.prototype = {
        getClosestOverlay: function (element) {
            var overlay = element;
            while (overlay.parentNode && !overlay.classList.contains('mvc-lookup-overlay')) {
                overlay = overlay.parentNode;
            }

            if (overlay == document) {
                throw new Error('Lookup dialog has to be inside a mvc-lookup-overlay.');
            }

            return overlay;
        },

        show: function () {
            var body = document.body.getBoundingClientRect();
            if (body.left + body.right < window.innerWidth) {
                var paddingRight = parseFloat(getComputedStyle(document.body).paddingRight);
                document.body.style.paddingRight = (paddingRight + 17) + 'px';
            }

            document.body.classList.add('mvc-lookup-open');
            this.instance.style.display = 'block';
        },
        hide: function () {
            document.body.classList.remove('mvc-lookup-open');
            document.body.style.paddingRight = '';
            this.instance.style.display = '';
        },

        bind: function () {
            this.instance.removeEventListener('click', this.onClick);
            this.instance.addEventListener('click', this.onClick);
        },
        onClick: function (e) {
            var targetClasses = (e.target || e.srcElement).classList;

            if (targetClasses.contains('mvc-lookup-overlay') || targetClasses.contains('mvc-lookup-wrapper')) {
                MvcLookupDialog.prototype.current.close();
            }
        }
    };

    return MvcLookupOverlay;
}());
var MvcLookupAutocomplete = (function () {
    function MvcLookupAutocomplete(lookup) {
        this.instance = document.createElement('ul');
        this.instance.className = 'mvc-lookup-autocomplete';
        this.options = { minLength: 1, rows: 20 };
        this.activeItem = null;
        this.lookup = lookup;
        this.items = [];
    }

    MvcLookupAutocomplete.prototype = {
        search: function (term) {
            var autocomplete = this;
            var lookup = autocomplete.lookup;

            lookup.stopLoading();
            clearTimeout(autocomplete.searching);
            autocomplete.searching = setTimeout(function () {
                if (term.length < autocomplete.options.minLength || lookup.readonly) {
                    autocomplete.hide();

                    return;
                }

                lookup.startLoading({ search: term, rows: autocomplete.options.rows, page: 0 }, function (data) {
                    autocomplete.clear();

                    data = data.rows.filter(function (row) {
                        return !lookup.multi || lookup.indexOf(lookup.selected, row.LookupIdKey) < 0;
                    });

                    for (var i = 0; i < data.length; i++) {
                        var item = document.createElement('li');
                        item.dataset.id = data[i].LookupIdKey;
                        item.innerText = data[i].LookupAcKey;

                        autocomplete.instance.appendChild(item);
                        autocomplete.bind(item, [data[i]]);
                        autocomplete.items.push(item);
                    }

                    if (data.length) {
                        autocomplete.show();
                    } else {
                        autocomplete.hide();
                    }
                });
            }, autocomplete.lookup.options.searchDelay);
        },
        previous: function () {
            if (!this.instance.parentNode) {
                this.search(this.lookup.search.value);

                return;
            }

            if (this.activeItem) {
                this.activeItem.classList.remove('active');

                this.activeItem = this.activeItem.previousSibling || this.items[this.items.length - 1];
                this.activeItem.classList.add('active');
            } else if (this.items.length) {
                this.activeItem = this.items[this.items.length - 1];
                this.activeItem.classList.add('active');
            }
        },
        next: function () {
            if (!this.instance.parentNode) {
                this.search(this.lookup.search.value);

                return;
            }

            if (this.activeItem) {
                this.activeItem.classList.remove('active');

                this.activeItem = this.activeItem.nextSibling || this.items[0];
                this.activeItem.classList.add('active');
            } else if (this.items.length) {
                this.activeItem = this.items[0];
                this.activeItem.classList.add('active');
            }
        },
        clear: function () {
            this.items = [];
            this.activeItem = null;
            this.instance.innerHTML = '';
        },
        show: function () {
            var search = this.lookup.search.getBoundingClientRect();

            this.instance.style.left = (search.left + window.pageXOffset) + 'px';
            this.instance.style.top = (search.top + search.height + window.pageYOffset) + 'px';

            document.body.appendChild(this.instance);
        },
        hide: function () {
            this.clear();

            if (this.instance.parentNode) {
                document.body.removeChild(this.instance);
            }
        },

        bind: function (item, data) {
            var autocomplete = this;
            var lookup = autocomplete.lookup;

            item.addEventListener('mousedown', function (e) {
                e.preventDefault();
            });

            item.addEventListener('click', function () {
                if (lookup.multi) {
                    lookup.select(lookup.selected.concat(data), true);
                } else {
                    lookup.select(data, true);
                }

                lookup.stopLoading();
                autocomplete.hide();
            });

            item.addEventListener('mouseenter', function () {
                if (autocomplete.activeItem) {
                    autocomplete.activeItem.classList.remove('active');
                }

                this.classList.add('active');
                autocomplete.activeItem = this;
            });
        }
    };

    return MvcLookupAutocomplete;
}());
var MvcLookup = (function () {
    function MvcLookup(element, options) {
        var group = this.closestGroup(element);
        if (group.dataset.id) {
            return this.instances[parseInt(group.dataset.id)].set(options || {});
        }

        this.items = [];
        this.events = {};
        this.group = group;
        this.selected = [];
        this.for = group.dataset.for;
        this.url = group.dataset.url;
        this.multi = group.dataset.multi == 'true';
        this.group.dataset.id = this.instances.length;
        this.readonly = group.dataset.readonly == 'true';
        this.options = { searchDelay: 500, loadingDelay: 300 };

        this.search = group.querySelector('.mvc-lookup-input');
        this.browser = group.querySelector('.mvc-lookup-browser');
        this.control = group.querySelector('.mvc-lookup-control');
        this.error = group.querySelector('.mvc-lookup-control-error');
        this.valueContainer = group.querySelector('.mvc-lookup-values');
        this.values = this.valueContainer.querySelectorAll('.mvc-lookup-value');

        this.autocomplete = new MvcLookupAutocomplete(this);
        this.filter = new MvcLookupFilter(this);
        this.dialog = new MvcLookupDialog(this);
        this.instances.push(this);
        this.set(options || {});

        this.reload(false);
        this.cleanUp();
        this.bind();
    }

    MvcLookup.prototype = {
        instances: [],
        lang: {
            search: 'Search...',
            select: 'Select ({0})',
            noData: 'No data found',
            error: 'Error while retrieving records'
        },

        closestGroup: function (element) {
            var lookup = element;
            while (lookup.parentNode && !lookup.classList.contains('mvc-lookup')) {
                lookup = lookup.parentNode;
            }

            if (lookup == document) {
                throw new Error('Lookup can only be created from within mvc-lookup structure.');
            }

            return lookup;
        },

        extend: function () {
            var options = {};

            for (var i = 0; i < arguments.length; i++) {
                for (var key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key)) {
                        if (Object.prototype.toString.call(options[key]) == '[object Object]') {
                            options[key] = this.extend(options[key], arguments[i][key]);
                        } else {
                            options[key] = arguments[i][key];
                        }
                    }
                }
            }

            return options;
        },
        set: function (options) {
            this.autocomplete.options = this.extend(this.autocomplete.options, options.autocomplete);
            this.setReadonly(options.readonly == null ? this.readonly : options.readonly);
            this.dialog.options = this.extend(this.dialog.options, options.dialog);
            this.events = this.extend(this.events, options.events);

            return this;
        },
        setReadonly: function (readonly) {
            this.readonly = readonly;

            if (readonly) {
                this.search.tabIndex = -1;
                this.search.readOnly = true;
                this.group.classList.add('mvc-lookup-readonly');

                if (this.browser) {
                    this.browser.tabIndex = -1;
                }
            } else {
                this.search.removeAttribute('readonly');
                this.search.removeAttribute('tabindex');
                this.group.classList.remove('mvc-lookup-readonly');

                if (this.browser) {
                    this.browser.removeAttribute('tabindex');
                }
            }

            this.resizeSearch();
        },

        browse: function () {
            if (!this.readonly) {
                this.dialog.open();
            }
        },
        reload: function (triggerChanges) {
            var rows = [];
            var lookup = this;
            var originalValue = lookup.search.value;
            var ids = [].filter.call(lookup.values, function (element) { return element.value; });

            if (ids.length) {
                lookup.startLoading({ ids: ids, rows: ids.length, page: 0 }, function (data) {
                    for (var i = 0; i < ids.length; i++) {
                        var index = lookup.indexOf(data.rows, ids[i].value);
                        if (index >= 0) {
                            rows.push(data.rows[index]);
                        }
                    }

                    lookup.select(rows, triggerChanges);
                });
            } else {
                lookup.stopLoading();
                lookup.select(rows, triggerChanges);

                if (!lookup.multi && lookup.search.name) {
                    lookup.search.value = originalValue;
                }
            }
        },
        select: function (data, triggerChanges) {
            var lookup = this;
            triggerChanges = triggerChanges == null || triggerChanges;

            if (lookup.events.select && lookup.events.select.apply(lookup, [data, triggerChanges]) === false) {
                return;
            }

            if (triggerChanges && data.length == lookup.selected.length) {
                triggerChanges = false;
                for (var i = 0; i < data.length && !triggerChanges; i++) {
                    triggerChanges = data[i].LookupIdKey != lookup.selected[i].LookupIdKey;
                }
            }

            lookup.selected = data;

            if (lookup.multi) {
                lookup.search.value = '';
                lookup.valueContainer.innerHTML = '';;
                lookup.items.forEach(function (item) {
                    item.parentNode.removeChild(item);
                });

                lookup.items = lookup.createSelectedItems(data);
                lookup.items.forEach(function (item) {
                    lookup.control.insertBefore(item, lookup.search);
                });

                lookup.values = lookup.createValues(data);
                lookup.values.forEach(function (value) {
                    lookup.valueContainer.appendChild(value);
                });

                lookup.resizeSearch();
            } else if (data.length) {
                lookup.values[0].value = data[0].LookupIdKey;
                lookup.search.value = data[0].LookupAcKey;
            } else {
                lookup.values[0].value = '';
                lookup.search.value = '';
            }

            if (triggerChanges) {
                if (typeof (Event) === 'function') {
                    var change = new Event('change');
                } else {
                    var change = document.createEvent('Event');
                    change.initEvent('change', true, true);
                }

                lookup.search.dispatchEvent(change);
                [].forEach.call(lookup.values, function (value) {
                    value.dispatchEvent(change);
                });
            }
        },
        selectFirst: function (triggerChanges) {
            var lookup = this;

            lookup.startLoading({ search: '', rows: 1, page: 0 }, function (data) {
                lookup.select(data.rows, triggerChanges);
            });
        },
        selectSingle: function (triggerChanges) {
            var lookup = this;

            lookup.startLoading({ search: '', rows: 2, page: 0 }, function (data) {
                if (data.rows.length == 1) {
                    lookup.select(data.rows, triggerChanges);
                } else {
                    lookup.select([], triggerChanges);
                }
            });
        },

        createSelectedItems: function (data) {
            var items = [];

            for (var i = 0; i < data.length; i++) {
                var button = document.createElement('button');
                button.className = 'mvc-lookup-deselect';
                button.innerText = '×';
                button.type = 'button';

                var item = document.createElement('div');
                item.innerText = data[i].LookupAcKey || '';
                item.className = 'mvc-lookup-item';
                item.appendChild(button);
                items.push(item);

                this.bindDeselect(button, data[i].LookupIdKey);
            }

            return items;
        },
        createValues: function (data) {
            var inputs = [];

            for (var i = 0; i < data.length; i++) {
                var input = document.createElement('input');
                input.className = 'mvc-lookup-value';
                input.value = data[i].LookupIdKey;
                input.type = 'hidden';
                input.name = this.for;

                inputs.push(input);
            }

            return inputs;
        },

        startLoading: function (search, success, error) {
            var lookup = this;

            lookup.stopLoading();
            lookup.loading = setTimeout(function () {
                lookup.group.classList.add('mvc-lookup-loading');
            }, lookup.options.loadingDelay);
            lookup.group.classList.remove('mvc-lookup-error');

            lookup.request = new XMLHttpRequest();
            lookup.request.open('GET', lookup.filter.formUrl(search), true);

            lookup.request.onload = function () {
                if (200 <= lookup.request.status && lookup.request.status < 400) {
                    lookup.stopLoading();

                    success(JSON.parse(lookup.request.responseText))
                } else {
                    lookup.request.onerror();
                }
            };

            lookup.request.onerror = function () {
                lookup.group.classList.add('mvc-lookup-error');
                lookup.error.title = lookup.lang.error;
                lookup.stopLoading();

                if (error) {
                    error();
                }
            };

            lookup.request.send();
        },
        stopLoading: function () {
            if (this.request && this.request.readyState != 4) {
                this.request.abort();
            }

            clearTimeout(this.loading);
            this.group.classList.remove('mvc-lookup-loading');
        },

        bindDeselect: function (close, id) {
            var lookup = this;

            close.addEventListener('click', function () {
                lookup.select(lookup.selected.filter(function (value) { return value.LookupIdKey != id; }), true);
                lookup.search.focus();
            });
        },
        indexOf: function (selection, id) {
            for (var i = 0; i < selection.length; i++) {
                if (selection[i].LookupIdKey == id) {
                    return i;
                }
            }

            return -1;
        },
        resizeSearch: function () {
            if (this.items.length) {
                var style = getComputedStyle(this.control);
                var contentWidth = this.control.clientWidth;
                var lastItem = this.items[this.items.length - 1];
                contentWidth -= parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
                var widthLeft = Math.floor(contentWidth - lastItem.offsetLeft - lastItem.offsetWidth);

                if (widthLeft > contentWidth / 3) {
                    style = getComputedStyle(this.search);
                    widthLeft -= parseFloat(style.marginLeft) + parseFloat(style.marginRight) + 4;
                    this.search.style.width = widthLeft + 'px';
                } else {
                    this.search.style.width = '';
                }
            } else {
                this.search.style.width = '';
            }
        },
        cleanUp: function () {
            delete this.group.dataset.readonly;
            delete this.group.dataset.filters;
            delete this.group.dataset.dialog;
            delete this.group.dataset.search;
            delete this.group.dataset.multi;
            delete this.group.dataset.order;
            delete this.group.dataset.title;
            delete this.group.dataset.page;
            delete this.group.dataset.rows;
            delete this.group.dataset.sort;
            delete this.group.dataset.url;
        },
        bind: function () {
            var lookup = this;

            window.addEventListener('resize', function () {
                lookup.resizeSearch();
            });

            lookup.search.addEventListener('focus', function () {
                lookup.group.classList.add('mvc-lookup-focus');
            });

            lookup.search.addEventListener('blur', function () {
                lookup.stopLoading();
                lookup.autocomplete.hide();
                lookup.group.classList.remove('mvc-lookup-focus');

                var originalValue = this.value;
                if (!lookup.multi && lookup.selected.length) {
                    if (lookup.selected[0].LookupAcKey != this.value) {
                        lookup.select([], true);
                    }
                } else {
                    this.value = '';
                }

                if (!lookup.multi && lookup.search.name) {
                    this.value = originalValue;
                }
            });

            lookup.search.addEventListener('keydown', function (e) {
                if (e.which == 8 && !this.value.length && lookup.selected.length) {
                    lookup.select(lookup.selected.slice(0, -1), true);
                } else if (e.which == 38) {
                    e.preventDefault();

                    lookup.autocomplete.previous();
                } else if (e.which == 40) {
                    e.preventDefault();

                    lookup.autocomplete.next();
                } else if (e.which == 13 && lookup.autocomplete.activeItem) {
                    if (typeof (Event) === 'function') {
                        var click = new Event('click');
                    } else {
                        var click = document.createEvent('Event');
                        click.initEvent('click', true, true);
                    }

                    lookup.autocomplete.activeItem.dispatchEvent(click);
                }
            });
            lookup.search.addEventListener('input', function () {
                if (!this.value.length && !lookup.multi && lookup.selected.length) {
                    lookup.autocomplete.hide();
                    lookup.select([], true);
                }

                lookup.autocomplete.search(this.value);
            });

            if (lookup.browser) {
                lookup.browser.addEventListener('click', function () {
                    lookup.browse();
                });
            }

            for (var i = 0; i < lookup.filter.additionalFilters.length; i++) {
                var inputs = document.querySelectorAll('[name="' + lookup.filter.additionalFilters[i] + '"]');

                for (var j = 0; j < inputs.length; j++) {
                    inputs[j].addEventListener('change', function (e) {
                        lookup.stopLoading();
                        lookup.filter.page = 0;

                        if (lookup.events.filterChange && lookup.events.filterChange.apply(lookup) === false) {
                            return;
                        }

                        if (lookup.selected.length) {
                            var rows = [];
                            var ids = [].filter.call(lookup.values, function (element) { return element.value; });

                            lookup.startLoading({ checkIds: ids, rows: ids.length }, function (data) {
                                for (var i = 0; i < ids.length; i++) {
                                    var index = lookup.indexOf(data.rows, ids[i].value);
                                    if (index >= 0) {
                                        rows.push(data.rows[index]);
                                    }
                                }

                                lookup.select(rows, true);
                            }, function () {
                                lookup.select(rows, true);
                            });
                        }
                    });
                }
            }
        }
    };

    return MvcLookup;
}());
