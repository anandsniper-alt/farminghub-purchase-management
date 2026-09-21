# Item Master identity-correction release report

**Released:** 2026-09-21  
**Site:** https://purchase.dvjassociates.com  
**Runtime:** `d11918f147a236e85c5f010e5373d923ecc0c03d`  
**Coolify deployment:** `biiv5slzzxdju89x2dugfdov` — finished, running:healthy

DEC-063 / WF-057 is live. A Purchase Manager or Admin can open **Edit item master** from a PLM brand-variant row, correct the current ERP Item Code and/or select a configured Brand / brand code, provide the mandatory correction reason and save. The permanent internal/software item identity remains fixed. If an item has appeared on a PO, its Base Item Code/supplier cannot change. Issued PO lines, complaints and audit history retain the original recorded code and brand; new work uses the corrected master.

Verification:

- 226 native tests passed.
- 39 server/standalone browser checks passed, including editable code/brand fields, role enforcement, mandatory reason and immutable issued-PO lines.
- 16 read-only live checks passed against the observed `PW8RG` / `FH-LAE-I-PO-23` case: exact deployed assets, visible edit action, enabled fields, prefix-labelled brand, reason field, preservation warning, mobile fit, zero runtime errors and zero business-write requests.
- A fresh 415,895,552-byte SQLite backup passed integrity and isolated restored-copy startup before deployment.
- Final preservation remained at revision 1372 with 24 orders, 37 vendors, 389 items, 107 price lists, 136 file records and 1,474 workspace events. Every pre-release account, file body, audit event, archive and retry receipt remained unchanged; SQLite integrity remained `ok`.

The live `PW8RG` item and issued PO were read only during verification. No Item Master correction was submitted automatically. The manager can now set the intended code, such as `GJ-PW8RG`, enter the reason and save deliberately.
