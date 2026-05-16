# alanbradley

fights for the user on the grid.

## description

`alanbradley` is a lightweight table filter, sorting, and pagination library, with optional background chunking.

It's unopinionated about style, allowing the user to theme their tables with their own CSS.

## features

- zero dependencies
- progressive background chunking for large datasets
- client-side sort (numeric, date, string)
- global text search across configurable fields
- per-column dropdown filters
- pagination with configurable page sizes
- fully themable via CSS custom properties

## installation

```bash
npm install @renderorange/alanbradley
```

Or copy `src/alanbradley.js` and `src/alanbradley.css` into your project.

## usage

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
    ],
    filters: [
      { key: "status", label: "Status", options: ["active", "closed"] },
    ],
    search_fields: ["name", "status"],
    render_row: function (item) {
      return (
        "<tr>" +
        '<td data-label="ID">' +
        item.id +
        "</td>" +
        '<td data-label="Name">' +
        item.name +
        "</td>" +
        '<td data-label="Status">' +
        item.status +
        "</td>" +
        "</tr>"
      );
    },
  });
</script>
```

## API contract

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

## options

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
| `filters[].options`  | array    | required              | Values (strings or `{value, label}` objects) |
| `search_fields`      | array    | `[]`                  | Field names to search across                 |
| `render_row`         | function | required              | Returns HTML string for a data row           |
| `page_size`          | number   | `50`                  | Rows per page                                |
| `page_size_options`  | array    | `[25, 50, 100]`       | Available page sizes                         |
| `chunk`              | boolean  | `true`                | Enable progressive chunked loading           |
| `chunk_size`         | number   | `500`                 | Records per chunk                            |
| `search_placeholder` | string   | `'Search...'`         | Search input placeholder                     |
| `empty_message`      | string   | `'No records found.'` | Message when no data                         |

## public methods

| Method                        | Description                       |
| ----------------------------- | --------------------------------- |
| `refresh()`                   | Re-fetch all data                 |
| `go_to_page(n)`               | Navigate to page n                |
| `set_sort(column, direction)` | Set sort programmatically         |
| `set_filter(key, value)`      | Set a filter value                |
| `clear_filters()`             | Reset all filters and search      |
| `search(term)`                | Set search term programmatically  |
| `destroy()`                   | Remove all generated DOM elements |

## HTML structure

```html
<!-- Controls row: search + filters -->
<table class="alanbradley">
  <thead>
    <!-- generated by JS -->
  </thead>
  <tbody>
    <!-- generated by JS -->
  </tbody>
</table>

<!-- Status bar: page size, pagination, count -->
<div class="alanbradley-status">
  <select class="alanbradley-page-size">
    ...
  </select>
  <span class="alanbradley-page-size-label">per page</span>
  <div class="alanbradley-pagination">...</div>
  <span class="alanbradley-status-text">Showing 1-50 of 200</span>
</div>
```

## CSS customization

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
}
```

### dark mode

```css
[data-theme="dark"] {
  --alanbradley-row-hover-bg: #363636;
  --alanbradley-filter-bg: #333;
  --alanbradley-filter-border: #555;
  --alanbradley-search-bg: #333;
  --alanbradley-search-border: #555;
  --alanbradley-status-color: #999;
  --alanbradley-empty-color: #999;
}
```

### bootstrap 5

Add Bootstrap's `.table` class alongside `.alanbradley` for base table styling:

```html
<table id="my-table" class="table alanbradley"></table>
```

## license and copyright

Copyright (c) 2026 Blaine Motsinger under the MIT license.
