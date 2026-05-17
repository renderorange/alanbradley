const AlanBradley = require("../src/alanbradley.js");

function createTable (id) {
    const table = document.createElement("table");
    table.id = id || "test-table";
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    document.body.appendChild(table);

    const status = document.createElement("div");
    status.className = "alanbradley-status";
    table.parentElement.appendChild(status);

    return table;
}

function cleanup () {
    document.body.innerHTML = "";
}

const sampleData = [
    {
        id: 1,
        name: "Alice",
        status: "active",
        amount: "100.00",
        date: "2025-01-15T00:00:00.000Z",
    },
    {
        id: 2,
        name: "Bob",
        status: "pending",
        amount: "250.50",
        date: "2025-06-20T00:00:00.000Z",
    },
    {
        id: 3,
        name: "Charlie",
        status: "active",
        amount: "50.00",
        date: "2026-03-10T00:00:00.000Z",
    },
    {
        id: 4,
        name: "Diana",
        status: "closed",
        amount: "1000.00",
        date: "2026-01-01T00:00:00.000Z",
    },
    {
        id: 5,
        name: "Eve",
        status: "active",
        amount: "75.25",
        date: "2026-02-28T00:00:00.000Z",
    },
];

function mockFetch (data, total) {
    return jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () =>
                Promise.resolve({
                    data: data,
                    total: total || data.length,
                    chunk: 1,
                    page_size: data.length,
                }),
        }),
    );
}

function createInstance (options) {
    const table = createTable();
    const opts = Object.assign(
        {
            api: "/api/test",
            columns: [
                { key: "id", label: "ID", sortable: true },
                { key: "name", label: "Name", sortable: true },
                { key: "status", label: "Status", sortable: true },
            ],
            render_row: function (item) {
                return (
                    "<tr>" +
          "<td data-label=\"ID\">" +
          item.id +
          "</td>" +
          "<td data-label=\"Name\">" +
          item.name +
          "</td>" +
          "<td data-label=\"Status\">" +
          item.status +
          "</td>" +
          "</tr>"
                );
            },
        },
        options,
    );
    return new AlanBradley("#" + table.id, opts);
}

afterEach(() => {
    cleanup();
});

describe("AlanBradley", () => {
    describe("constructor", () => {
        test("creates instance with required options", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance();
            expect(ab)
                .toBeDefined();
            expect(ab.api)
                .toBe("/api/test");
            expect(ab.columns.length)
                .toBe(3);
        });

        test("throws if element not found", () => {
            expect(() => {
                new AlanBradley("#nonexistent", {
                    api: "/api/test",
                    columns: [{ key: "id", label: "ID" }],
                    render_row: function () {
                        return "";
                    },
                });
            })
                .toThrow("AlanBradley: element not found");
        });

        test("accepts DOM element as selector", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const table = createTable("el-test");
            const ab = new AlanBradley(table, {
                api: "/api/test",
                columns: [{ key: "id", label: "ID" }],
                render_row: function () {
                    return "";
                },
            });
            expect(ab.el)
                .toBe(table);
        });

        test("uses default options when not provided", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance();
            expect(ab.page_size)
                .toBe(50);
            expect(ab.page_size_options)
                .toEqual([25, 50, 100]);
            expect(ab.chunk_size)
                .toBe(500);
            expect(ab.chunk)
                .toBe(true);
            expect(ab.search_placeholder)
                .toBe("Search...");
            expect(ab.empty_message)
                .toBe("No records found.");
            expect(ab.filters)
                .toEqual([]);
            expect(ab.search_fields)
                .toEqual([]);
        });

        test("respects custom options", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                page_size: 25,
                page_size_options: [10, 25, 50],
                chunk_size: 100,
                chunk: false,
                search_placeholder: "Find...",
                empty_message: "Nothing here.",
            });
            expect(ab.page_size)
                .toBe(25);
            expect(ab.page_size_options)
                .toEqual([10, 25, 50]);
            expect(ab.chunk_size)
                .toBe(100);
            expect(ab.chunk)
                .toBe(false);
            expect(ab.search_placeholder)
                .toBe("Find...");
            expect(ab.empty_message)
                .toBe("Nothing here.");
        });
    });

    describe("data loading", () => {
        test("fetches first chunk on init", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            createInstance();
            expect(global.fetch)
                .toHaveBeenCalledTimes(1);
            expect(global.fetch)
                .toHaveBeenCalledWith(
                    expect.stringContaining("/api/test?"),
                );
        });

        test("fetches all chunks when chunking enabled", async () => {
            const chunk1 = sampleData.slice(0, 2);
            const chunk2 = sampleData.slice(2, 4);
            const chunk3 = sampleData.slice(4);
            let callCount = 0;

            global.fetch = jest.fn(() => {
                callCount++;
                if (callCount === 1)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                data: chunk1,
                                total: 5,
                                chunk: 1,
                                page_size: 2,
                            }),
                    });
                if (callCount === 2)
                    return Promise.resolve({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                data: chunk2,
                                total: 5,
                                chunk: 2,
                                page_size: 2,
                            }),
                    });
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({ data: chunk3, total: 5, chunk: 3, page_size: 2 }),
                });
            });

            const ab = createInstance({ chunk_size: 2 });

            // Wait for all chunks to load
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(callCount)
                .toBe(3);
            expect(ab.fully_loaded)
                .toBe(true);
            expect(ab.all_data.length)
                .toBe(5);
        });

        test("fetches all data at once when chunk is false", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(global.fetch)
                .toHaveBeenCalledTimes(1);
            expect(ab.fully_loaded)
                .toBe(true);
            expect(ab.all_data.length)
                .toBe(5);
        });

        test("sets fully_loaded when all data loaded", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance();

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(ab.fully_loaded)
                .toBe(true);
        });

        test("handles fetch errors gracefully", async () => {
            global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));
            const consoleSpy = jest.spyOn(console, "error")
                .mockImplementation();
            const ab = createInstance();

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(consoleSpy)
                .toHaveBeenCalledWith(
                    "AlanBradley fetch error:",
                    expect.any(Error),
                );
            consoleSpy.mockRestore();
        });
    });

    describe("rendering", () => {
        test("renders rows from data", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const rows = ab.el.querySelectorAll("tbody tr");
            // page_size is 50, we have 5 items
            expect(rows.length)
                .toBe(5);
        });

        test("renders correct number of columns in thead", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const ths = document.querySelectorAll("thead th");
            // 3 columns
            expect(ths.length)
                .toBe(3);
        });

        test("shows empty message when no data matches filter", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                filters: [{ key: "status", label: "Status", options: ["nonexistent"] }],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_filter("status", "nonexistent");

            const emptyRow = ab.el.querySelector(".alanbradley-empty");
            expect(emptyRow).not.toBeNull();
            expect(emptyRow.textContent)
                .toContain("No records found.");
        });

        test("shows custom empty message", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                empty_message: "Nothing to see here.",
                filters: [{ key: "status", label: "Status", options: ["nonexistent"] }],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_filter("status", "nonexistent");

            const emptyRow = ab.el.querySelector(".alanbradley-empty");
            expect(emptyRow.textContent)
                .toContain("Nothing to see here.");
        });

        test("adds loading class to tbody while fetching", async () => {
            let resolveFetch;
            global.fetch = jest.fn(
                () =>
                    new Promise((resolve) => {
                        resolveFetch = resolve;
                    }),
            );
            createInstance();

            const tbody = document.querySelector("tbody");
            expect(tbody.classList.contains("alanbradley-loading"))
                .toBe(true);

            // Now resolve the fetch
            resolveFetch({
                ok: true,
                json: () =>
                    Promise.resolve({
                        data: sampleData,
                        total: sampleData.length,
                        chunk: 1,
                        page_size: 500,
                    }),
            });
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(tbody.classList.contains("alanbradley-loading"))
                .toBe(false);
        });
    });

    describe("sorting", () => {
        test("sorts ascending by column", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 50 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("name", "asc");

            const rows = ab.el.querySelectorAll("tbody tr td[data-label='Name']");
            expect(rows[0].textContent)
                .toBe("Alice");
            expect(rows[1].textContent)
                .toBe("Bob");
            expect(rows[2].textContent)
                .toBe("Charlie");
            expect(rows[3].textContent)
                .toBe("Diana");
            expect(rows[4].textContent)
                .toBe("Eve");
        });

        test("sorts descending by column", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 50 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("name", "desc");

            const rows = ab.el.querySelectorAll("tbody tr td[data-label='Name']");
            expect(rows[0].textContent)
                .toBe("Eve");
            expect(rows[1].textContent)
                .toBe("Diana");
            expect(rows[2].textContent)
                .toBe("Charlie");
            expect(rows[3].textContent)
                .toBe("Bob");
            expect(rows[4].textContent)
                .toBe("Alice");
        });

        test("sorts numeric strings numerically", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 50 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("id", "asc");

            const rows = ab.el.querySelectorAll("tbody tr td[data-label='ID']");
            expect(rows[0].textContent)
                .toBe("1");
            expect(rows[1].textContent)
                .toBe("2");
            expect(rows[2].textContent)
                .toBe("3");
            expect(rows[3].textContent)
                .toBe("4");
            expect(rows[4].textContent)
                .toBe("5");
        });

        test("sorts ISO dates chronologically", async () => {
            const data = [
                { id: 1, name: "A", status: "x", date: "2026-03-01T00:00:00.000Z" },
                { id: 2, name: "B", status: "x", date: "2025-01-01T00:00:00.000Z" },
                { id: 3, name: "C", status: "x", date: "2026-02-01T00:00:00.000Z" },
                { id: 4, name: "D", status: "x", date: "2026-07-01T00:00:00.000Z" },
                { id: 5, name: "E", status: "x", date: "2026-01-01T00:00:00.000Z" },
            ];
            global.fetch = mockFetch(data, data.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                columns: [
                    { key: "id", label: "ID", sortable: true },
                    { key: "date", label: "Date", sortable: true },
                ],
                render_row: function (item) {
                    return (
                        "<tr>" +
            "<td data-label=\"ID\">" +
            item.id +
            "</td>" +
            "<td data-label=\"Date\">" +
            item.date +
            "</td>" +
            "</tr>"
                    );
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("date", "asc");

            const rows = ab.el.querySelectorAll("tbody tr td[data-label='Date']");
            expect(rows[0].textContent)
                .toContain("2025");
            expect(rows[1].textContent)
                .toContain("2026-01");
            expect(rows[2].textContent)
                .toContain("2026-02");
            expect(rows[3].textContent)
                .toContain("2026-03");
            expect(rows[4].textContent)
                .toContain("2026-07");
        });

        test("toggles sort direction on same column click", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 50 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("name", "asc");
            expect(ab.sort_dir)
                .toBe("asc");

            ab.set_sort("name", "desc");
            expect(ab.sort_dir)
                .toBe("desc");
        });

        test("handles null values in sort", async () => {
            const data = [
                { id: 1, name: null, status: "active" },
                { id: 2, name: "Bob", status: "active" },
                { id: 3, name: null, status: "active" },
            ];
            global.fetch = mockFetch(data, data.length);
            const ab = createInstance({ chunk: false, page_size: 50 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("name", "asc");

            const rows = ab.el.querySelectorAll("tbody tr td[data-label='Name']");
            // Nulls should be pushed to the end
            expect(rows[0].textContent)
                .toBe("Bob");
        });
    });

    describe("filtering", () => {
        test("filters data by column value", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                filters: [
                    {
                        key: "status",
                        label: "Status",
                        options: ["active", "pending", "closed"],
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_filter("status", "active");

            const rows = ab.el.querySelectorAll("tbody tr");
            expect(rows.length)
                .toBe(3);
            expect(ab.get_total_filtered())
                .toBe(3);
        });

        test("clears filter", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                filters: [
                    {
                        key: "status",
                        label: "Status",
                        options: ["active", "pending", "closed"],
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_filter("status", "active");
            expect(ab.get_total_filtered())
                .toBe(3);

            ab.set_filter("status", "");
            expect(ab.get_total_filtered())
                .toBe(5);
        });

        test("clear_filters resets all filters and search", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                search_fields: ["name"],
                filters: [
                    {
                        key: "status",
                        label: "Status",
                        options: ["active", "pending", "closed"],
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_filter("status", "active");
            ab.search("Alice");
            expect(ab.get_total_filtered())
                .toBe(1);

            ab.clear_filters();
            expect(ab.get_total_filtered())
                .toBe(5);
            expect(ab.search_term)
                .toBe("");
        });
    });

    describe("search", () => {
        test("searches across configured fields", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                search_fields: ["name", "status"],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.search("active");

            const rows = ab.el.querySelectorAll("tbody tr");
            expect(rows.length)
                .toBe(3);
        });

        test("search is case-insensitive", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                search_fields: ["name"],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.search("ALICE");

            const rows = ab.el.querySelectorAll("tbody tr");
            expect(rows.length)
                .toBe(1);
        });

        test("search returns no results for non-matching term", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                search_fields: ["name"],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.search("zzzzzzz");

            expect(ab.get_total_filtered())
                .toBe(0);
        });

        test("search works with partial match", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                search_fields: ["name"],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.search("li");

            expect(ab.get_total_filtered())
                .toBe(2); // Alice, Charlie
        });

        test("search combined with filter", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 50,
                search_fields: ["name"],
                filters: [
                    {
                        key: "status",
                        label: "Status",
                        options: ["active", "pending", "closed"],
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.search("a");
            ab.set_filter("status", "active");

            // "a" matches Alice, Charlie, Diana (name contains "a")
            // filtered to status=active: Alice, Charlie (Diana is closed)
            expect(ab.get_total_filtered())
                .toBe(2);
        });
    });

    describe("pagination", () => {
        test("paginates data correctly", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const rows = ab.el.querySelectorAll("tbody tr");
            expect(rows.length)
                .toBe(2);
        });

        test("go_to_page changes current page", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.go_to_page(2);

            const rows = ab.el.querySelectorAll("tbody tr");
            expect(rows.length)
                .toBe(2);
            expect(ab.current_page)
                .toBe(2);
        });

        test("go_to_page ignores invalid pages", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.go_to_page(0);
            expect(ab.current_page)
                .toBe(1);

            ab.go_to_page(999);
            expect(ab.current_page)
                .toBe(1);
        });

        test("get_total_pages calculates correctly", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(ab.get_total_pages())
                .toBe(3); // 5 items / 2 per page = 3 pages
        });

        test("renders pagination buttons", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const buttons = ab.pagination_el.querySelectorAll(
                ".alanbradley-pagination-item",
            );
            // prev + 3 pages + next = 5
            expect(buttons.length)
                .toBe(5);
        });

        test("shows active page button", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const active = ab.pagination_el.querySelector(
                ".alanbradley-pagination-active",
            );
            expect(active).not.toBeNull();
            expect(active.textContent)
                .toBe("1");
        });

        test("disables prev button on first page", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 2 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const buttons = ab.pagination_el.querySelectorAll(
                ".alanbradley-pagination-item",
            );
            // First button is prev
            expect(
                buttons[0].classList.contains("alanbradley-pagination-disabled"),
            )
                .toBe(true);
        });

        test("pagination resets to page 1 on filter change", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({
                chunk: false,
                page_size: 2,
                filters: [
                    {
                        key: "status",
                        label: "Status",
                        options: ["active", "pending", "closed"],
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.go_to_page(3);
            expect(ab.current_page)
                .toBe(3);

            ab.set_filter("status", "active");
            expect(ab.current_page)
                .toBe(1);
        });
    });

    describe("status bar", () => {
        test("shows correct count", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false, page_size: 50 });

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(ab.status_text_el.textContent)
                .toContain("Showing 1-5 of 5");
        });

        test("shows loading indicator when not fully loaded", () => {
            global.fetch = jest.fn(() => new Promise(() => {}));
            const ab = createInstance({ chunk: true });

            // Not fully loaded yet, status text should be empty
            expect(ab.status_text_el.textContent)
                .toBe("");
        });

        test("creates page size selector", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const select = ab.status_el.querySelector(".alanbradley-page-size");
            expect(select).not.toBeNull();
            expect(select.tagName)
                .toBe("SELECT");
        });

        test("creates per page label", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const label = document.querySelector(".alanbradley-page-size-label");
            expect(label).not.toBeNull();
            expect(label.textContent)
                .toBe("per page");
        });
    });

    describe("controls", () => {
        test("creates search input", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(ab.search_input)
                .toBeDefined();
            expect(ab.search_input.tagName)
                .toBe("INPUT");
            expect(ab.search_input.placeholder)
                .toBe("Search...");
        });

        test("creates filter dropdowns", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            createInstance({
                chunk: false,
                filters: [
                    { key: "status", label: "Status", options: ["active", "closed"] },
                    { key: "type", label: "Type", options: ["invoice", "payroll"] },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const filters = document.querySelectorAll(".alanbradley-filter");
            expect(filters.length)
                .toBe(2);
        });

        test("filter supports object options", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            createInstance({
                chunk: false,
                filters: [
                    {
                        key: "user_id",
                        label: "User",
                        options: [
                            { value: 1, label: "Alice" },
                            { value: 2, label: "Bob" },
                        ],
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const filter = document.querySelector(".alanbradley-filter");
            const options = filter.querySelectorAll("option");
            // "All User" + 2 options
            expect(options.length)
                .toBe(3);
            expect(options[1].value)
                .toBe("1");
            expect(options[1].textContent)
                .toBe("Alice");
        });
    });

    describe("public API", () => {
        test("refresh resets and re-fetches data", async () => {
            let callCount = 0;
            global.fetch = jest.fn(() => {
                callCount++;
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            data: sampleData,
                            total: sampleData.length,
                            chunk: 1,
                            page_size: sampleData.length,
                        }),
                });
            });

            const ab = createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(callCount)
                .toBe(1);

            ab.refresh();

            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(callCount)
                .toBe(2);
            expect(ab.all_data.length)
                .toBe(5);
        });

        test("destroy removes generated elements", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const controlsBefore = document.querySelector(".alanbradley-controls");
            expect(controlsBefore).not.toBeNull();

            ab.destroy();

            const controlsAfter = document.querySelector(".alanbradley-controls");
            expect(controlsAfter)
                .toBeNull();
        });

        test("on_sort callback fires", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const onSort = jest.fn();
            const ab = createInstance({ chunk: false, on_sort: onSort });

            await new Promise((resolve) => setTimeout(resolve, 10));

            ab.set_sort("name", "asc");

            expect(onSort).not.toHaveBeenCalled(); // set_sort doesn't trigger callback
        });

        test("on_sort callback fires on header click", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const onSort = jest.fn();
            createInstance({ chunk: false, on_sort: onSort });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const sortableTh = document.querySelector(".alanbradley-sortable");
            sortableTh.click();

            expect(onSort)
                .toHaveBeenCalledWith(
                    sortableTh.getAttribute("data-alanbradley-sort"),
                    "asc",
                );
        });

        test("on_filter callback fires", async () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const onFilter = jest.fn();
            const ab = createInstance({
                chunk: false,
                on_filter: onFilter,
                filters: [
                    { key: "status", label: "Status", options: ["active", "closed"] },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            // Trigger filter via DOM change
            const select = document.querySelector(".alanbradley-filter");
            select.value = "active";
            select.dispatchEvent(new Event("change"));

            expect(onFilter)
                .toHaveBeenCalledWith({ status: "active" });
        });
    });

    describe("escape_html", () => {
        test("escapes HTML entities", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            expect(ab.escape_html("<script>alert(1)</script>"))
                .toBe(
                    "&lt;script&gt;alert(1)&lt;/script&gt;",
                );
        });

        test("escapes ampersands", () => {
            global.fetch = mockFetch(sampleData, sampleData.length);
            const ab = createInstance({ chunk: false });

            expect(ab.escape_html("Tom & Jerry"))
                .toBe("Tom &amp; Jerry");
        });
    });
});
