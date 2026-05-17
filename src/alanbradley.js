/**
 * AlanBradley - lightweight table filter, sorting, and pagination library
 * with optional background chunking.
 *
 * Usage:
 *   const table = new AlanBradley('#my-table', {
 *       api: '/api/endpoint',
 *       columns: [{ key: 'name', label: 'Name', sortable: true }],
 *       filters: [{ key: 'status', label: 'Status', options: ['active', 'closed'] }],
 *       search_fields: ['name', 'email'],
 *       render_row: (item) => '<tr><td>' + item.name + '</td></tr>'
 *   });
 */
(function () {
    "use strict";

    function AlanBradley (selector, options) {
        this.el =
      typeof selector === "string"
          ? document.querySelector(selector)
          : selector;
        if (!this.el)
            throw new Error("AlanBradley: element not found: " + selector);

        this.api = options.api;
        this.columns = options.columns || [];
        this.filters = options.filters || [];
        this.search_fields = options.search_fields || [];
        this.render_row = options.render_row;
        this.page_size = options.page_size || 50;
        this.page_size_options = options.page_size_options || [25, 50, 100];
        this.chunk_size = options.chunk_size || 500;
        this.chunk = options.chunk !== false;
        this.search_placeholder = options.search_placeholder || "Search...";
        this.empty_message = options.empty_message || "No records found.";
        this.on_sort = options.on_sort || null;
        this.on_filter = options.on_filter || null;

        this.all_data = [];
        this.loaded_chunks = {};
        this.total = 0;
        this.fully_loaded = false;
        this.current_page = 1;
        this.sort_column = null;
        this.sort_dir = "asc";
        this.search_term = "";
        this.filter_values = {};
        this.search_timeout = null;

        this.init();
    }

    AlanBradley.prototype.init = function () {
        this.build_controls();
        this.build_table();
        this.build_status();
        this.el.querySelector("tbody").classList.add("alanbradley-loading");
        this.fetch_chunk(1);
    };

    // --- Data loading ---

    AlanBradley.prototype.fetch_chunk = function (chunk_num) {
        let self = this;
        if (this.loaded_chunks[chunk_num]) return;

        let params = new URLSearchParams();
        params.set("chunk", chunk_num);
        params.set("page_size", this.chunk ? this.chunk_size : 999999);

        let url = this.api + "?" + params.toString();
        this.loaded_chunks[chunk_num] = "loading";

        fetch(url)
            .then(function (response) {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .then(function (result) {
                self.total = result.total;
                self.all_data = self.all_data.concat(result.data);
                self.loaded_chunks[chunk_num] = "done";

                if (!self.chunk) {
                    self.fully_loaded = true;
                } else {
                    let total_chunks = Math.ceil(self.total / self.chunk_size);
                    if (chunk_num >= total_chunks) {
                        self.fully_loaded = true;
                    } else {
                        self.fetch_chunk(chunk_num + 1);
                    }
                }

                self.render();
            })
            .catch(function (err) {
                console.error("AlanBradley fetch error:", err);
                self.loaded_chunks[chunk_num] = "error";
            });
    };

    // --- Data accessors ---

    AlanBradley.prototype.get_filtered_data = function () {
        let data = this.all_data;
        let self = this;

        // Column filters
        let filter_keys = Object.keys(this.filter_values);
        if (filter_keys.length > 0) {
            data = data.filter(function (row) {
                for (let i = 0; i < filter_keys.length; i++) {
                    let key = filter_keys[i];
                    let val = String(row[key] || "")
                        .toLowerCase();
                    if (val !== self.filter_values[key].toLowerCase()) return false;
                }
                return true;
            });
        }

        // Search
        if (this.search_term && this.search_fields.length > 0) {
            let term = this.search_term.toLowerCase();
            data = data.filter(function (row) {
                for (let i = 0; i < self.search_fields.length; i++) {
                    let field = self.search_fields[i];
                    let val = String(row[field] || "")
                        .toLowerCase();
                    if (val.indexOf(term) !== -1) return true;
                }
                return false;
            });
        }

        return data;
    };

    AlanBradley.prototype.get_sorted_data = function () {
        let data = this.get_filtered_data();

        if (this.sort_column) {
            let col = this.sort_column;
            let dir = this.sort_dir === "desc" ? -1 : 1;
            data = data.slice()
                .sort(function (a, b) {
                    let va = a[col];
                    let vb = b[col];

                    // Handle nulls
                    if (va == null && vb == null) return 0;
                    if (va == null) return dir;
                    if (vb == null) return -dir;

                    // Date sort (ISO date strings)
                    if (
                        typeof va === "string" &&
          /^\d{4}-\d{2}-\d{2}/.test(va) &&
          typeof vb === "string" &&
          /^\d{4}-\d{2}-\d{2}/.test(vb)
                    ) {
                        let da = new Date(va)
                            .getTime();
                        let db = new Date(vb)
                            .getTime();
                        if (!isNaN(da) && !isNaN(db)) {
                            return (da - db) * dir;
                        }
                    }

                    // Numeric sort (handles string-encoded numbers)
                    let na = parseFloat(va);
                    let nb = parseFloat(vb);
                    if (!isNaN(na) && !isNaN(nb) && String(va)
                        .indexOf("-") !== 0) {
                        return (na - nb) * dir;
                    }

                    // String sort
                    va = String(va)
                        .toLowerCase();
                    vb = String(vb)
                        .toLowerCase();
                    if (va < vb) return -1 * dir;
                    if (va > vb) return 1 * dir;
                    return 0;
                });
        }

        return data;
    };

    AlanBradley.prototype.get_page_data = function () {
        let sorted = this.get_sorted_data();
        let start = (this.current_page - 1) * this.page_size;
        let end = start + this.page_size;
        return sorted.slice(start, end);
    };

    AlanBradley.prototype.get_total_filtered = function () {
        return this.get_filtered_data().length;
    };

    AlanBradley.prototype.get_total_pages = function () {
        let total = this.get_total_filtered();
        return Math.max(1, Math.ceil(total / this.page_size));
    };

    // --- Rendering ---

    AlanBradley.prototype.render = function () {
        this.render_rows();
        this.render_pagination();
        this.render_status();
    };

    AlanBradley.prototype.render_rows = function () {
        let tbody = this.el.querySelector("tbody");
        let page_data = this.get_page_data();

        if (page_data.length === 0 && this.all_data.length > 0) {
            // Filtered to nothing
            tbody.innerHTML =
        "<tr class=\"alanbradley-empty\"><td colspan=\"" +
        this.columns.length +
        "\">" +
        this.escape_html(this.empty_message) +
        "</td></tr>";
            return;
        }

        if (page_data.length === 0) {
            tbody.classList.add("alanbradley-loading");
            return;
        }

        tbody.classList.remove("alanbradley-loading");
        let html = "";
        for (let i = 0; i < page_data.length; i++) {
            html += this.render_row(page_data[i]);
        }
        tbody.innerHTML = html;
    };

    AlanBradley.prototype.render_pagination = function () {
        let el = this.pagination_el;
        let total_pages = this.get_total_pages();

        if (total_pages <= 1) {
            el.innerHTML = "";
            return;
        }

        let html = "";

        // Previous
        if (this.current_page > 1) {
            html +=
        "<button class=\"alanbradley-pagination-item\" data-alanbradley-page=\"" +
        (this.current_page - 1) +
        "\">&laquo;</button>";
        } else {
            html +=
        "<button class=\"alanbradley-pagination-item alanbradley-pagination-disabled\">&laquo;</button>";
        }

        // Page numbers (sliding window of 5)
        let start = Math.max(1, this.current_page - 2);
        let end = Math.min(total_pages, this.current_page + 2);

        if (start > 1) {
            html +=
        "<button class=\"alanbradley-pagination-item\" data-alanbradley-page=\"1\">1</button>";
            if (start > 2)
                html +=
          "<span class=\"alanbradley-pagination-item alanbradley-pagination-disabled\">&hellip;</span>";
        }

        for (let p = start; p <= end; p++) {
            if (p === this.current_page) {
                html +=
          "<button class=\"alanbradley-pagination-item alanbradley-pagination-active\">" +
          p +
          "</button>";
            } else {
                html +=
          "<button class=\"alanbradley-pagination-item\" data-alanbradley-page=\"" +
          p +
          "\">" +
          p +
          "</button>";
            }
        }

        if (end < total_pages) {
            if (end < total_pages - 1)
                html +=
          "<span class=\"alanbradley-pagination-item alanbradley-pagination-disabled\">&hellip;</span>";
            html +=
        "<button class=\"alanbradley-pagination-item\" data-alanbradley-page=\"" +
        total_pages +
        "\">" +
        total_pages +
        "</button>";
        }

        // Next
        if (this.current_page < total_pages) {
            html +=
        "<button class=\"alanbradley-pagination-item\" data-alanbradley-page=\"" +
        (this.current_page + 1) +
        "\">&raquo;</button>";
        } else {
            html +=
        "<button class=\"alanbradley-pagination-item alanbradley-pagination-disabled\">&raquo;</button>";
        }

        el.innerHTML = html;

        // Bind click handlers
        let self = this;
        let buttons = el.querySelectorAll("[data-alanbradley-page]");
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener("click", function () {
                self.go_to_page(
                    parseInt(this.getAttribute("data-alanbradley-page"), 10),
                );
            });
        }
    };

    AlanBradley.prototype.render_status = function () {
        let filtered_total = this.get_total_filtered();
        if (filtered_total === 0 && this.all_data.length === 0) {
            this.status_text_el.textContent = "";
            return;
        }
        let start = (this.current_page - 1) * this.page_size + 1;
        let end = Math.min(this.current_page * this.page_size, filtered_total);
        let text = "Showing " + start + "-" + end + " of " + filtered_total;

        if (!this.fully_loaded) {
            let loaded = this.all_data.length;
            let remaining = this.total - loaded;
            text += " (" + remaining + " more loading)";
        }

        this.status_text_el.textContent = text;
    };

    // --- UI builders ---

    AlanBradley.prototype.build_controls = function () {
        let container = this.el.parentElement;

        // Search + filters row
        let controls = document.createElement("div");
        controls.className = "alanbradley-controls";
        let self = this;

        // Search input (left)
        let search = document.createElement("input");
        search.type = "text";
        search.className = "alanbradley-search";
        search.placeholder = this.search_placeholder;
        search.addEventListener("input", function () {
            clearTimeout(self.search_timeout);
            self.search_timeout = setTimeout(function () {
                self.search_term = search.value.trim();
                self.current_page = 1;
                self.render();
            }, 300);
        });
        this.search_input = search;
        controls.appendChild(search);

        // Filter dropdowns (right)
        for (let f = 0; f < this.filters.length; f++) {
            let filter = this.filters[f];
            let filter_wrapper = document.createElement("span");

            let label = document.createElement("label");
            label.className = "alanbradley-filter-label";
            label.textContent = filter.label;
            filter_wrapper.appendChild(label);

            let select = document.createElement("select");
            select.className = "alanbradley-filter";
            select.setAttribute("data-alanbradley-filter", filter.key);

            let all_opt = document.createElement("option");
            all_opt.value = "";
            all_opt.textContent = "All " + filter.label;
            select.appendChild(all_opt);

            for (let o = 0; o < filter.options.length; o++) {
                let option = document.createElement("option");
                let opt_val = filter.options[o];
                if (typeof opt_val === "object" && opt_val !== null) {
                    option.value = opt_val.value;
                    option.textContent = opt_val.label;
                } else {
                    option.value = opt_val;
                    option.textContent = opt_val;
                }
                select.appendChild(option);
            }

            (function (key) {
                select.addEventListener("change", function () {
                    if (this.value) {
                        self.filter_values[key] = this.value;
                    } else {
                        delete self.filter_values[key];
                    }
                    self.current_page = 1;
                    self.render();
                    if (self.on_filter) self.on_filter(self.filter_values);
                });
            })(filter.key);

            filter_wrapper.appendChild(select);
            controls.appendChild(filter_wrapper);
        }

        container.insertBefore(controls, this.el);
    };

    AlanBradley.prototype.build_table = function () {
        let thead = this.el.querySelector("thead");
        if (!thead) {
            thead = document.createElement("thead");
            this.el.insertBefore(thead, this.el.firstChild);
        }
        thead.innerHTML = "";

        let tr = document.createElement("tr");
        let self = this;
        for (let i = 0; i < this.columns.length; i++) {
            let col = this.columns[i];
            let th = document.createElement("th");
            th.className = "alanbradley-th";
            th.textContent = col.label;

            if (col.sortable) {
                th.classList.add("alanbradley-sortable");
                th.setAttribute("data-alanbradley-sort", col.key);
                (function (key) {
                    th.addEventListener("click", function () {
                        if (self.sort_column === key) {
                            self.sort_dir = self.sort_dir === "asc" ? "desc" : "asc";
                        } else {
                            self.sort_column = key;
                            self.sort_dir = "asc";
                        }
                        self.current_page = 1;
                        self.update_sort_indicators();
                        self.render();
                        if (self.on_sort) self.on_sort(self.sort_column, self.sort_dir);
                    });
                })(col.key);
            }

            tr.appendChild(th);
        }

        thead.appendChild(tr);
    };

    AlanBradley.prototype.build_status = function () {
        let next = this.el.nextElementSibling;
        if (next && next.classList.contains("alanbradley-status")) {
            this.status_el = next;
        } else {
            this.status_el = document.createElement("div");
            this.status_el.className = "alanbradley-status";
            this.el.parentElement.insertBefore(this.status_el, next);
        }

        let self = this;

        // Page size selector
        let page_size_select = document.createElement("select");
        page_size_select.className = "alanbradley-page-size";
        for (let i = 0; i < this.page_size_options.length; i++) {
            let opt = document.createElement("option");
            opt.value = this.page_size_options[i];
            opt.textContent = this.page_size_options[i];
            if (this.page_size_options[i] === this.page_size) opt.selected = true;
            page_size_select.appendChild(opt);
        }
        page_size_select.addEventListener("change", function () {
            self.page_size = parseInt(this.value, 10);
            self.current_page = 1;
            self.render();
        });
        this.page_size_el = page_size_select;

        // "per page" label
        let page_size_label = document.createElement("span");
        page_size_label.className = "alanbradley-page-size-label";
        page_size_label.textContent = "per page";

        // Pagination container
        this.pagination_el = document.createElement("div");
        this.pagination_el.className = "alanbradley-pagination";

        // Status text
        this.status_text_el = document.createElement("span");
        this.status_text_el.className = "alanbradley-status-text";

        this.status_el.appendChild(this.page_size_el);
        this.status_el.appendChild(page_size_label);
        this.status_el.appendChild(this.pagination_el);
        this.status_el.appendChild(this.status_text_el);
    };

    AlanBradley.prototype.update_sort_indicators = function () {
        let ths = this.el.querySelectorAll(".alanbradley-sortable");
        for (let i = 0; i < ths.length; i++) {
            ths[i].classList.remove("alanbradley-sort-asc", "alanbradley-sort-desc");
            if (
                this.sort_column &&
        ths[i].getAttribute("data-alanbradley-sort") === this.sort_column
            ) {
                ths[i].classList.add(
                    this.sort_dir === "asc"
                        ? "alanbradley-sort-asc"
                        : "alanbradley-sort-desc",
                );
            }
        }
    };

    // --- Public API ---

    AlanBradley.prototype.go_to_page = function (page) {
        let total_pages = this.get_total_pages();
        if (page < 1 || page > total_pages) return;
        this.current_page = page;
        this.render();
    };

    AlanBradley.prototype.set_sort = function (column, direction) {
        this.sort_column = column;
        this.sort_dir = direction;
        this.current_page = 1;
        this.update_sort_indicators();
        this.render();
    };

    AlanBradley.prototype.set_filter = function (key, value) {
        if (value) {
            this.filter_values[key] = value;
        } else {
            delete this.filter_values[key];
        }
        let select = this.el.parentElement.querySelector(
            "[data-alanbradley-filter=\"" + key + "\"]",
        );
        if (select) select.value = value || "";
        this.current_page = 1;
        this.render();
    };

    AlanBradley.prototype.clear_filters = function () {
        this.filter_values = {};
        this.search_term = "";
        if (this.search_input) this.search_input.value = "";
        let selects = this.el.parentElement.querySelectorAll(
            "[data-alanbradley-filter]",
        );
        for (let i = 0; i < selects.length; i++) {
            selects[i].value = "";
        }
        this.current_page = 1;
        this.render();
    };

    AlanBradley.prototype.search = function (term) {
        this.search_term = term;
        if (this.search_input) this.search_input.value = term;
        this.current_page = 1;
        this.render();
    };

    AlanBradley.prototype.refresh = function () {
        this.all_data = [];
        this.loaded_chunks = {};
        this.fully_loaded = false;
        this.current_page = 1;
        let tbody = this.el.querySelector("tbody");
        tbody.classList.add("alanbradley-loading");
        this.fetch_chunk(1);
    };

    AlanBradley.prototype.destroy = function () {
        let controls = this.el.parentElement.querySelector(".alanbradley-controls");
        if (controls) controls.remove();
        this.pagination_el.innerHTML = "";
        this.status_el.innerHTML = "";
    };

    AlanBradley.prototype.escape_html = function (str) {
        let div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    // Export
    if (typeof module !== "undefined" && module.exports) {
        module.exports = AlanBradley;
    } else {
        window.AlanBradley = AlanBradley;
    }
})();
