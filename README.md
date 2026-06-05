# @renderorange/alanbradley

Lightweight table filter, sorting, and pagination library, with optional background chunking.

`alanbradley` fights for the user on the grid.

## Features

- zero dependencies
- progressive background chunking for large datasets
- client-side sort (numeric, date, string)
- global text search across configurable fields (including nested data)
- per-column dropdown and date range filters
- pagination with configurable page sizes
- expandable subtable rows
- fully themable via CSS custom properties

## Installation

```bash
npm install @renderorange/alanbradley
```

Or copy `src/alanbradley.js` and `src/alanbradley.css` into your project.

## Usage

```html
<link rel="stylesheet" href="alanbradley.css" />

<table id="my-table">
    <tbody></tbody>
</table>
<div class="alanbradley-status"></div>

<script src="alanbradley.js"></script>
<script>
    new AlanBradley("#my-table", {
        api: "/api/items",
        columns: [
            { key: "id", label: "ID", sortable: true },
            { key: "name", label: "Name", sortable: true },
            { key: "status", label: "Status", sortable: true },

            // add an empty column definition for the edit button below
            { key: "", label: "", sortable: false },
        ],
        filters: [
            { key: "status", label: "Status", type: "select", options: ["active", "closed"] },
            { key: "created_at", label: "Created", type: "date" },
        ],
        search_fields: ["name", "status"],
        render_row: function (item) {
            return (
                '<tr>' +
                '<td data-label="ID">' + item.id + '</td>' +
                '<td data-label="Name">' + item.name + '</td>' +
                '<td data-label="Status">' + item.status + '</td>' +
                '<td data-label=""><a href="/item/' +
                item.id +
                '/edit" class="btn btn-sm">Edit</a></td>' +
                '</tr>'
            );
        },
    });
</script>
```

## API Contract

Your API endpoint must accept:

```
GET /api/items?chunk=1&page_size=500
```

And return:

```json
{
    "data": [{ "id": 1, "name": "Item 1" }],
    "total": 150,
    "chunk": 1,
    "page_size": 500
}
```

| Field       | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `data`      | array  | Array of row objects         |
| `total`     | number | Total records in the dataset |
| `chunk`     | number | Current chunk number         |
| `page_size` | number | Records per chunk            |

## Options

| Option               | Type     | Default               | Description                                  |
| -------------------- | -------- | --------------------- | -------------------------------------------- |
| `api`                | string   | required              | API endpoint URL                             |
| `columns`            | array    | required              | Column definitions                           |
| `columns[].key`      | string   | required              | Data field name (also used as sort key)      |
| `columns[].label`    | string   | required              | Header display text                          |
| `columns[].sortable` | boolean  | `false`               | Whether column is sortable                   |
| `filters`            | array    | `[]`                  | Dropdown filter definitions                  |
| `filters[].key`      | string   | required              | Data field to filter on                      |
| `filters[].label`    | string   | required              | Display label                                |
| `filters[].type`     | string   | `'select'`            | Filter type: `'select'` (dropdown) or `'date'` (date range) |
| `filters[].options`  | array    | required for `select` | Values (strings or `{value, label}` objects) |
| `search_fields`      | array    | `[]`                  | Field names to search across (supports dot-notation for nested data) |
| `render_row`         | function | required              | Returns HTML string for a data row           |
| `render_expanded`    | function | `null`                | Returns HTML string for expanded row content  |
| `on_expand`          | function | `null`                | Callback fired when a row is expanded        |
| `on_collapse`        | function | `null`                | Callback fired when a row is collapsed      |
| `page_size`          | number   | `50`                  | Rows per page                                |
| `page_size_options`  | array    | `[25, 50, 100]`       | Available page sizes                         |
| `chunk`              | boolean  | `true`                | Enable progressive chunked loading           |
| `chunk_size`         | number   | `500`                 | Records per chunk                            |
| `search_placeholder` | string   | `'Search...'`         | Search input placeholder                     |
| `empty_message`      | string   | `'No records found.'` | Message when no data                         |

## Public Methods

| Method                        | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `refresh()`                   | Re-fetch all data                              |
| `go_to_page(n)`               | Navigate to page n                             |
| `set_sort(column, direction)` | Set sort programmatically                      |
| `set_filter(key, value)`      | Set a filter value (for `type: 'date'`, value is `{from, to}`) |
| `clear_filters()`             | Reset all filters and search                    |
| `search(term)`                | Set search term programmatically                |
| `toggle_row(index)`           | Toggle expanded state of row at index           |
| `expand_row(index)`           | Expand row at index                             |
| `collapse_row(index)`         | Collapse row at index                           |
| `collapse_all()`              | Collapse all expanded rows                      |
| `destroy()`                   | Remove all generated DOM elements               |

## HTML Structure

```html
<!-- Controls row: search + filters -->
<table class="alanbradley">
    <thead>
        <!-- generated by JS -->
    </thead>
    <tbody>
        <!-- generated by JS -->
        <!-- with render_expanded, each row gets a toggle cell, -->
        <!-- and expanded rows get a colspan td with your content -->
    </tbody>
</table>

<!-- Status bar: page size, pagination, count -->
<div class="alanbradley-status">
    <select class="alanbradley-page-size">...</select>
    <span class="alanbradley-page-size-label">per page</span>
    <div class="alanbradley-pagination">...</div>
    <span class="alanbradley-status-text">Showing 1-50 of 200</span>
</div>
```

## Expandable Rows

When `render_expanded` is provided, each row gets a toggle button in the first column. Clicking it reveals the content returned by `render_expanded`:

```js
new AlanBradley("#my-table", {
    api: "/api/items",
    columns: [
        { key: "id", label: "ID", sortable: true },
        { key: "name", label: "Name", sortable: true },
        { key: "status", label: "Status", sortable: true },
    ],
    search_fields: ["name", "items.description"],
    render_row: function (item) {
        return (
            "<tr>" +
            '<td data-label="ID">' + item.id + "</td>" +
            '<td data-label="Name">' + item.name + "</td>" +
            '<td data-label="Status">' + item.status + "</td>" +
            "</tr>"
        );
    },
    render_expanded: function (item) {
        if (!item.items || item.items.length === 0) {
            return "<p>No items found.</p>";
        }
        var html = '<dl>';
        for (var i = 0; i < item.items.length; i++) {
            html += '<dt>' + item.items[i].label + '</dt>';
            html += '<dd>' + item.items[i].description + '</dd>';
        }
        html += '</dl>';
        return html;
    },
});
```

Expanded rows are collapsed automatically when sorting, filtering, searching, or changing pages.

### Nested Search

`search_fields` supports dot-notation paths for searching nested data:

```js
search_fields: ["name", "items.description"]
```

When a path resolves to an array (e.g., `items`), each item's field (e.g., `description`) is searched. A match on any nested item includes the parent row in results.

## CSS Customization

All styling uses CSS custom properties. Override `:root` or target a specific container:

```css
:root {
    --alanbradley-sort-arrow-color: #6c757d;
    --alanbradley-active-sort-color: #0d6efd;
    --alanbradley-row-hover-bg: #f1f3f5;
    --alanbradley-pagination-active-bg: #0d6efd;
    --alanbradley-pagination-active-color: #fff;
    --alanbradley-pagination-hover-bg: #e9ecef;
    --alanbradley-loading-opacity: 0.5;
    --alanbradley-filter-bg: #fff;
    --alanbradley-filter-border: #ced4da;
    --alanbradley-filter-border-radius: 0.375rem;
    --alanbradley-search-bg: #fff;
    --alanbradley-search-border: #ced4da;
    --alanbradley-search-border-radius: 0.375rem;
    --alanbradley-status-color: #6c757d;
    --alanbradley-empty-color: #6c757d;
    --alanbradley-toggle-color: #6c757d;
    --alanbradley-toggle-hover-color: #0d6efd;
    --alanbradley-expanded-bg: #f8f9fa;
    --alanbradley-expanded-border: #dee2e6;
}
```

### Dark mode

```css
[data-theme="dark"] {
    --alanbradley-row-hover-bg: #363636;
    --alanbradley-filter-bg: #333;
    --alanbradley-filter-border: #555;
    --alanbradley-search-bg: #333;
    --alanbradley-search-border: #555;
    --alanbradley-status-color: #999;
    --alanbradley-empty-color: #999;
    --alanbradley-toggle-color: #999;
    --alanbradley-toggle-hover-color: #6c9eff;
    --alanbradley-expanded-bg: #2b2b2b;
    --alanbradley-expanded-border: #444;
}
```

### Bootstrap 5

Add Bootstrap's `.table` class alongside `.alanbradley` for base table styling:

```html
<table id="my-table" class="table alanbradley"></table>
```

## License

MIT
