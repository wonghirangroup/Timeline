---
tags: [module, branch]
---

# Module: Branch

← [[00-HOME]] | Files: `server/src/modules/branch/`

## ภาพรวม

จัดการสาขา + ผูก Manager เข้ากับ Branch

## Files

| File | สถานะ |
|------|-------|
| `branch.route.ts` | TODO |
| `branch.service.ts` | TODO |
| `branch.schema.ts` | TODO |

## API Routes

```
GET    /api/v1/admin/branches
POST   /api/v1/admin/branches
GET    /api/v1/admin/branches/:id
PATCH  /api/v1/admin/branches/:id
DELETE /api/v1/admin/branches/:id   (soft delete)
POST   /api/v1/admin/branches/:id/managers   (assign manager)
DELETE /api/v1/admin/branches/:id/managers/:userId
```

## Service Methods (TODO)

```typescript
listBranches(tenantId: string): Promise<Branch[]>
createBranch(tenantId: string, data): Promise<Branch>
updateBranch(tenantId: string, branchId: string, data): Promise<Branch>
softDeleteBranch(tenantId: string, branchId: string): Promise<void>
assignManager(branchId: string, userId: string): Promise<void>
removeManager(branchId: string, userId: string): Promise<void>
```

## DB Models

→ [[02-Database#Branch]] | [[02-Database#BranchManager]]

## Rules

- Employee สังกัด Branch เดียวในช่วงเวลาหนึ่ง
- Manager เห็นเฉพาะ Branch ที่ assigned ใน `BranchManager`
- ต้องมี `tenant_id` filter ทุก query

## Related

- [[Module-Employee]] — Employee สังกัด Branch
- [[Module-Shift]] — Shift ผูกกับ Branch
- [[04-Roles-Permissions]] — Manager scope
