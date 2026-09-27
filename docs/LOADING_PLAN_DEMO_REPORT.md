# Loading plan demo — 2026-09-26

Status: local review only. No publication or production business writes. DEC-096 / WF-090.

The demo uses a private copy of current records and separate browser storage. It provides single-order, same-supplier multi-order and multi-supplier planning. Users tick individual items and enter quantities; saving reserves each line on its original PO. RO assignment happens later. Distinct partial plans from one PO can share an RO without duplicate allocation.

The supplier filter limits the PO dropdown. Available quantities exclude all active reservations; fully allocated lines are absent from the default view and remain accessible under All items. Reserved, container-loaded and departed quantities are shown separately. Existing production-start, PI, QC, documents, payment and dispatch controls are retained. Records with completion remarks but no corresponding completed milestone remain unconfirmed; the demo does not repair live data.

Validation: 323 native tests passed; isolated server and standalone browser flows passed all three loading modes, dependent dropdowns, checkbox selection/exclusion, partial quantities, filter retention, saved-plan RO assignment and mobile controls, with zero JavaScript errors. Private evidence is kept outside Git.

Release remains subject to user approval and the mandatory fresh recovery ZIP/restore gate.
