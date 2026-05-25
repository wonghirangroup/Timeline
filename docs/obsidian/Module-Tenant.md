---
tags: [module, tenant, super-admin]
---

# Module: Tenant

← [[00-HOME]] | Files: `server/src/modules/tenant/`

## ภาพรวม

จัดการ tenant ทั้งหมด — ใช้โดย Super Admin เท่านั้น

## Files

| File | สถานะ |
|------|-------|
| `tenant.route.ts` | TODO |
| `tenant.service.ts` | TODO |
| `tenant.schema.ts` | TODO |

## API Routes

```
GET    /api/v1/super-admin/tenants
POST   /api/v1/super-admin/tenants
GET    /api/v1/super-admin/tenants/:id
PATCH  /api/v1/super-admin/tenants/:id
DELETE /api/v1/super-admin/tenants/:id   (soft delete)
GET    /api/v1/super-admin/tenants/:id/line-config
PUT    /api/v1/super-admin/tenants/:id/line-config
```

## Service Methods (TODO)

```typescript
createTenant(data: CreateTenantDto): Promise<Tenant>
listTenants(page, limit): Promise<Tenant[]>
getTenant(tenantId: string): Promise<Tenant>
updateTenant(tenantId: string, data): Promise<Tenant>
softDeleteTenant(tenantId: string): Promise<void>
setupLineConfig(tenantId: string, config: LineConfigDto): Promise<TenantLineConfig>
getLineConfig(tenantId: string): Promise<TenantLineConfig>
```

## DB Models

→ [[02-Database#Tenant]] | [[02-Database#TenantLineConfig]]

## Tenant Plans

| Plan | max_employees | max_branches |
|------|:-------------:|:------------:|
| FREE | 5 | 1 |
| STARTER | 20 | 3 |
| PRO | 100 | 10 |
| ENTERPRISE | unlimited | unlimited |

## Related

- [[05-Line-Integration]] — setup Line OA per tenant
- [[09-Frontend-Superadmin]] — UI สำหรับ manage tenant
- [[04-Roles-Permissions]] — SUPER_ADMIN only
