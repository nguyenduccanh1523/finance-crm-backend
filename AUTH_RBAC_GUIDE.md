# 📚 Hướng Dẫn Chi Tiết AUTH & RBAC Module

**Tài liệu này giải thích hoàn chỉnh cách hoạt động của hệ thống xác thực và phân quyền trong ứng dụng.**

---

## 📖 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Folder AUTH - Xác Thực](#folder-auth---xác-thực)
3. [Folder RBAC - Quyền Hạn](#folder-rbac---quyền-hạn)
4. [Luồng Xác Thực & Phân Quyền](#luồng-xác-thực--phân-quyền)
5. [Ví Dụ Thực Tế](#ví-dụ-thực-tế)

---

## 🎯 Tổng Quan

Hệ thống xác thực & phân quyền được chia thành 2 phần:

| Phần     | Trách Nhiệm                            | Dùng Công Nghệ                  |
| -------- | -------------------------------------- | ------------------------------- |
| **AUTH** | Đăng ký, đăng nhập, quản lý token      | JWT, OTP, Bcrypt, Redis         |
| **RBAC** | Quản lý vai trò, quyền hạn, permission | Roles, Permissions, Memberships |

---

## 📁 FOLDER AUTH - Xác Thực

### Mục Đích

Folder `auth` chịu trách nhiệm:

- ✅ Xác thực danh tính người dùng (email + password)
- ✅ Quản lý phiên đăng nhập (JWT tokens)
- ✅ Xác minh email qua OTP
- ✅ Refresh token khi hết hạn
- ✅ Đăng xuất an toàn

### Cấu Trúc File

```
auth/
├── auth.controller.ts          # API endpoints
├── auth.service.ts             # Business logic
├── auth.module.ts              # DI & imports
├── refresh-token.entity.ts      # DB model
├── decorators/
│   ├── current-user.decorator.ts    # @CurrentUser()
│   ├── roles.decorator.ts            # @Roles(...)
│   └── permissions.decorator.ts      # @Permissions(...)
├── dto/
│   ├── login.dto.ts             # Request validation
│   └── register.dto.ts
├── guards/
│   ├── jwt-auth.guard.ts         # Kiểm tra JWT
│   ├── roles.guard.ts            # Kiểm tra role
│   └── permission.guard.ts       # Kiểm tra permission
└── strategies/
    └── jwt.strategy.ts           # Passport JWT strategy
```

---

### ✏️ **File 1: auth.controller.ts** - Định Tuyến API

**Mục đích:** Định nghĩa các endpoint liên quan đến xác thực

**Các endpoint:**

```typescript
POST /auth/request-otp
  Input: { email: string }
  Output: { message: "OTP đã được gửi..." }
  Mục đích: Gửi mã OTP qua email

POST /auth/resend-otp
  Input: { email: string }
  Output: { message: "...", resendCount: number }
  Mục đích: Gửi lại OTP nếu hết hạn (giới hạn 5 lần)

POST /auth/verify-otp
  Input: { email: string, otp: string }
  Output: { message: "Email verified. You can now register." }
  Mục đích: Kiểm chứng mã OTP

POST /auth/register
  Input: { email, password, fullName }
  Output: { statusCode: 201, data: { id, email } }
  Điều kiện: Phải verify OTP trước
  Mục đích: Tạo tài khoản mới

POST /auth/login
  Input: { email, password }
  Output: { statusCode: 200, data: { id, email, fullName } }
  Cookie: access_token, refresh_token
  Mục đích: Đăng nhập, lưu token vào cookie

POST /auth/refresh
  Input: (lấy từ cookie refresh_token)
  Output: { statusCode: 200, data: { id, email } }
  Cookie: access_token, refresh_token (mới)
  Mục đích: Tạo access_token mới khi hết hạn

POST /auth/logout
  Guard: @UseGuards(JwtAuthGuard)
  Input: (lấy user từ JWT)
  Output: { statusCode: 200, message: "Đăng xuất thành công" }
  Cookie: xóa access_token & refresh_token
  Mục đích: Đăng xuất, revoke refresh token

GET /auth/me
  Guard: @UseGuards(JwtAuthGuard)
  Output: { id, email, roles }
  Mục đích: Lấy thông tin user hiện tại
```

**Cách hoạt động của cookies:**

```
Client              Server
  │                  │
  ├─→ POST /login ──→│
  │    email:pass    │ Verify password
  │                  │ Tạo JWT tokens
  │←─ Set-Cookie ────┤ access_token (15 phút)
  │    access_token  │ refresh_token (30 ngày)
  │    refresh_token │
  │                  │
  ├─→ GET /profile ─→│
  │    Cookie: jwt   │ JwtAuthGuard kiểm tra
  │                  │ req.user = JWT payload
  │←─ 200 OK ────────┤
```

---

### ✏️ **File 2: auth.service.ts** - Logic Xác Thực

**Mục đích:** Xử lý logic phức tạp: OTP, JWT, password

#### **A. Quy Trình Đăng Ký (3 Bước)**

```
┌─────────────────────────────────────────────────┐
│ 1. REQUEST OTP                                  │
├─────────────────────────────────────────────────┤
│ generateOTP(): Tạo 6 chữ số ngẫu nhiên        │
│ await cacheManager.set(otpKey, otp, 300s)      │
│   → Lưu vào Redis với expiry 5 phút            │
│ await mailService.sendOtp(email, otp)          │
│   → Gửi OTP qua email                          │
│ Set countKey = 0 (số lần resend)               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 2. VERIFY OTP                                   │
├─────────────────────────────────────────────────┤
│ cachedOtp = await cacheManager.get(otpKey)     │
│   → Lấy OTP từ Redis                           │
│ if (cachedOtp !== otp) throw Error             │
│   → OTP sai                                     │
│ await cacheManager.set(verifiedKey, 'true',... │
│   → Tạo flag "verified" (TTL=30 phút)         │
│ await cacheManager.del(otpKey)                 │
│   → Xóa OTP cũ tránh dùng lại                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 3. REGISTER                                     │
├─────────────────────────────────────────────────┤
│ isVerified = await cacheManager.get(verifiedKey)
│ if (!isVerified) throw "Phải verify OTP trước" │
│ passwordHash = await bcrypt.hash(password, 10) │
│   → Mã hóa password                            │
│ user = userRepo.create({                       │
│   email, passwordHash, fullName, ...           │
│ })                                              │
│ await userRepo.save(user)                      │
│   → Lưu vào database                           │
│ await cacheManager.del(verifiedKey)            │
│   → Xóa flag "verified"                        │
└─────────────────────────────────────────────────┘
```

**Lợi ích của cách này:**

- ✅ Ngăn spam (OTP cũ vẫn hiệu lực = không gửi mới)
- ✅ Giới hạn resend (max 5 lần)
- ✅ Xác minh email là thật (phải kiểm tra email)
- ✅ Token 1 lần sử dụng (xóa sau verify)

#### **B. Quy Trình Đăng Nhập**

```typescript
async login(email, password):
  1. validateUser(email, password):
     - Lấy user từ DB: const user = await userRepo.findOne({where: {email}})
     - Kiểm password: await bcrypt.compare(pass, user.passwordHash)
     - Kiểm status: if (user.status !== 1) throw "Tài khoản bị khoá"
     ✓ Trả về user

  2. signTokens(user):
     a) getUserGlobalRoles(userId):
        - Query user_roles table
        - Trả về danh sách role name: ["SUPER_ADMIN", "ADMIN"]

     b) Tạo Access Token:
        payload = { sub: userId, email, roles }
        accessToken = jwt.sign(payload, accessSecret)
        // TTL: 15-30 phút (quyết định ở config)

     c) Tạo Refresh Token:
        refreshToken = jwt.sign(payload, refreshSecret, {expiresIn: "30d"})

     d) Lưu Refresh Token Hash:
        hash = bcrypt.hash(refreshToken, 10)
        refreshTokenRepo.save({
          userId, token: hash, expiresAt, revokedAt: null
        })
        // Lưu hash, không lưu token gốc (bảo mật)

  3. Trả về: { user, accessToken, refreshToken }
```

**Tại sao lưu hash của refresh token?**

- 🔒 Nếu DB bị hack, attacker không có token gốc
- 🔒 Chỉ có hash, không thể access mà không biết token gốc
- ✅ An toàn hơn

#### **C. Quy Trình Refresh Token**

```typescript
async refresh(refreshTokenRaw):
  1. Verify JWT:
     payload = jwt.verify(refreshTokenRaw, refreshSecret)
     // Kiểm chữ ký & expiry

  2. Lấy user:
     user = userRepo.findOne({where: {id: payload.sub}})

  3. Kiểm DB:
     tokens = refreshTokenRepo.find({
       where: {userId: user.id, revokedAt: null}
     })
     // Lấy tất cả refresh token chưa revoke

  4. So sánh hash:
     for (token of tokens):
       isMatch = bcrypt.compare(refreshTokenRaw, token.token)
       if (isMatch && isNotExpired) {
         matched = true
         break
       }
     if (!matched) throw "Refresh token invalid"

  5. Tạo token mới:
     return signTokens(user)  // Rotate token (token mới)
```

**Token Rotation là gì?**

- 🔄 Mỗi lần refresh, tạo cả access_token lẫn refresh_token mới
- 🔒 Token cũ vô dụng nếu bị leak
- ⏰ Refresh token được extend lại 30 ngày

#### **D. Quy Trình Logout**

```typescript
async logout(userId):
  refreshTokenRepo.update(
    {userId, revokedAt: null},
    {revokedAt: new Date()}
  )
  // Đánh dấu tất cả refresh token là "revoked"
  // Lần sau khi refresh sẽ fail
```

---

### ✏️ **File 3: auth.module.ts** - Khai Báo Dependencies

**Mục đích:** Import các module cần dùng và exports

```typescript
@Module({
  imports: [
    // 1. Entities
    TypeOrmModule.forFeature([User, RefreshToken, Role])
    // ↑ Sử dụng repository của 3 entity này

    // 2. JWT Module
    JwtModule.register({
      secret: jwtConfig.accessSecret
      // ↑ Secret key để sign access token
      // Note: refresh secret trong jwtConfig.refreshSecret
    })

    // 3. Other modules
    MailerModule      // ↑ Gửi email OTP
    RbacModule        // ↑ Quản lý roles/permissions
  ],

  providers: [
    AuthService,      // Business logic
    JwtStrategy       // Passport JWT strategy
  ],

  controllers: [
    AuthController    // API endpoints
  ],

  exports: [
    AuthService       // Export để modules khác dùng
  ]
})
```

---

### ✏️ **File 4: guards/jwt-auth.guard.ts** - Kiểm Tra JWT

**Mục đích:** Bảo vệ endpoint, chỉ cho phép request có JWT hợp lệ

```typescript
// Sử dụng:
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user) {
  // Code chỉ chạy nếu JWT hợp lệ
}

// Luồng hoạt động:
1. Request đến với cookie access_token
2. JwtAuthGuard → JwtStrategy:
   - Lấy token từ cookie: cookieExtractor(req)
   - Verify chữ ký: jwt.verify(token, secret)
   - Kiểm expiry (nếu hết hạn → throw 401)

3. Nếu hợp lệ:
   - Decode payload: {sub, email, roles}
   - Gọi validate() trong JwtStrategy
   - Tạo req.user = {id, email, roles}
   - Cho phép request tiếp tục

4. Nếu không hợp lệ:
   - Return 401 Unauthorized
```

---

### ✏️ **File 5: guards/roles.guard.ts** - Kiểm Tra Role

**Mục đích:** Kiểm tra user có role yêu cầu không

```typescript
// Sử dụng:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Delete('user/:id')
deleteUser(@CurrentUser() user) {
  // Chỉ SUPER_ADMIN hoặc ADMIN mới vào được
}

// Luồng hoạt động:
1. JwtAuthGuard pass → req.user có roles
2. RolesGuard đọc metadata:
   requiredRoles = @Roles decorator → ['SUPER_ADMIN', 'ADMIN']

3. Kiểm tra:
   userRoles = req.user.roles // Từ JWT
   if (userRoles.includes('SUPER_ADMIN')) return true  // ✓ BYPASS
   if (requiredRoles.some(r => userRoles.includes(r)))
     return true  // ✓ Có role
   return false   // ✗ Không có role

4. Kết quả:
   ✓ Pass → Gọi handler
   ✗ Fail → 403 Forbidden
```

**SUPER_ADMIN Bypass:**

- SUPER_ADMIN luôn được phép không cần kiểm tra role khác
- Tương tự trong PermissionGuard

---

### ✏️ **File 6: guards/permission.guard.ts** - Kiểm Tra Permission

**Mục đích:** Kiểm tra user có permission chi tiết không

```typescript
// Sử dụng:
@UseGuards(JwtAuthGuard, PermissionGuard)
@Permissions('invoice:write', 'invoice:delete')
@Delete('invoice/:id')
deleteInvoice(@CurrentUser() user) {
  // Chỉ user có 1 trong 2 permission mới vào
}

// Luồng hoạt động:

┌─ 1. Kiểm SUPER_ADMIN bypass
│   if (user.roles.includes('SUPER_ADMIN')) return true ✓
│
├─ 2. Kiểm cache
│   cacheKey = "perm:global:user:{userId}"
│   cached = await cache.get(cacheKey)
│   if (cached) {
│     return requiredPerms.some(p => cached.includes(p))
│   }
│
├─ 3. Cache MISS → Query DB
│   memberships = membershipRepo.find({userId})
│     → Lấy tất cả org của user
│
│   roleIds = memberships.map(m => m.roleId)
│     → Lấy tất cả role IDs
│
│   rps = rolePermissionRepo.find({where: {roleId: In(roleIds)}})
│     → Lấy liên kết role-permission
│
│   permIds = rps.map(rp => rp.permissionId)
│     → Lấy tất cả permission IDs
│
│   perms = permissionRepo.find({where: {id: In(permIds)}})
│     → Lấy chi tiết permissions
│
│   permCodes = perms.map(p => p.code)
│     → Lấy tên permissions: ['invoice:read', 'invoice:write', ...]
│
├─ 4. Lưu cache
│   await cache.set(cacheKey, permCodes, 300)  // TTL 5 phút
│
└─ 5. So sánh & trả về
    return requiredPerms.some(p => permCodes.includes(p))
```

**Tại sao cần cache?**

- 🚀 Query DB mỗi request → chậm
- ⚡ Lưu vào Redis → nhanh hơn
- 🔄 TTL 5 phút → update định kỳ

---

### ✏️ **File 7: strategies/jwt.strategy.ts** - Giải Mã JWT

**Mục đích:** Strategy của Passport.js để xử lý JWT

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,  // ← Lấy token từ đâu
      ignoreExpiration: false,           // ← Kiểm expiry
      secretOrKey: jwtConfig.accessSecret // ← Secret key
    })
  }

  async validate(payload):
    // Được gọi sau khi JWT verify thành công
    // Trả về object này sẽ gán vào req.user
    return {
      id: payload.sub,           // User ID
      email: payload.email,      // Email
      roles: payload.roles || [] // Roles từ JWT
    }
}

// cookieExtractor (helper function):
function cookieExtractor(req):
  if (req && req.cookies.access_token)
    return req.cookies.access_token
  return null
```

---

### ✏️ **File 8: decorators/current-user.decorator.ts** - Lấy User

**Mục đích:** Shortcut để lấy user từ request

```typescript
// Thay vì:
@Get('profile')
getProfile(@Req() req) {
  const user = req.user  // ← Dài dòng
}

// Dùng:
@Get('profile')
getProfile(@CurrentUser() user) {
  // ← Gọn gàng, rõ ràng
}

// Implement:
export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest()
    return req.user  // ← JWT payload được gán ở đây
  }
)
```

---

### ✏️ **File 9: decorators/roles.decorator.ts** - Metadata Roles

**Mục đích:** Đánh dấu roles yêu cầu cho endpoint

```typescript
// Metadata key
export const ROLES_KEY = 'roles'

// Decorator
export const Roles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles)

// Sử dụng:
@Roles('ADMIN', 'SUPER_ADMIN')
@Delete('user/:id')
deleteUser() { ... }

// RolesGuard sẽ đọc metadata này:
const requiredRoles = reflector.getAllAndOverride(ROLES_KEY, [...])
// requiredRoles = ['ADMIN', 'SUPER_ADMIN']
```

---

### ✏️ **File 10: decorators/permissions.decorator.ts** - Metadata Permissions

**Mục đích:** Tương tự @Roles nhưng cho @Permissions

```typescript
export const PERMISSIONS_KEY = 'permissions'

export const Permissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms)

// Sử dụng:
@Permissions('invoice:write', 'invoice:delete')
@Delete('invoice/:id')
deleteInvoice() { ... }

// PermissionGuard sẽ đọc metadata này
```

---

### ✏️ **File 11: dto/login.dto.ts & register.dto.ts** - Validation

**Mục đích:** Validate request body tự động bằng class-validator

```typescript
// login.dto.ts
export class LoginDto {
  @IsEmail() // ← Email hợp lệ
  email: string;

  @IsString() // ← Là string
  @MinLength(6) // ← Tối thiểu 6 ký tự
  password: string;
}

// register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  fullName: string;
}

// NestJS transform & validate tự động:
// ✗ Sai format → 400 Bad Request + error message
// ✓ Đúng format → Gọi endpoint
```

---

### ✏️ **File 12: refresh-token.entity.ts** - Lưu Trữ Token

**Mục đích:** Lưu refresh token vào database để có thể revoke

```typescript
@Entity refresh_tokens {
  id: UUID              // ← Primary key

  userId: UUID          // ← FK → users
  user: User            // ← Relationship

  token: TEXT           // ← Hash của refresh token
                        //   (không lưu token gốc)

  expiresAt: TIMESTAMP  // ← Thời hạn expire
                        //   (30 ngày từ lúc tạo)

  revokedAt: TIMESTAMP  // ← Thời điểm logout
                        //   (NULL = chưa logout)

  userAgent: TEXT       // ← HTTP User-Agent (optional)
                        //   (phục vụ theo dõi device)

  ipAddress: TEXT       // ← Địa chỉ IP (optional)
}

// Ví dụ dữ liệu:
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "123e4567-e89b-12d3-a456-426614174000",
  token: "$2b$10$... (hash bcrypt)",
  expiresAt: "2026-04-20",
  revokedAt: null,    // ← Chưa logout
  userAgent: "Mozilla/5.0...",
  ipAddress: "192.168.1.100"
}

// Lợi ích của approach này:
✓ Có thể logout (set revokedAt)
✓ Có thể logout một device cụ thể
✓ Có thể theo dõi ai đăng nhập từ đâu
✓ Có thể invalidate refresh token hết hạn
```

---

## 📁 FOLDER RBAC - Quyền Hạn

### Mục Đích

Folder `rbac` (Role-Based Access Control) chịu trách nhiệm:

- ✅ Quản lý vai trò (roles)
- ✅ Quản lý quyền hạn (permissions)
- ✅ Gám role vào permission
- ✅ Gán user vào organization với role
- ✅ Gán global role cho user

### Cấu Trúc File

```
rbac/
├── rbac.service.ts              # Business logic
├── rbac-admin.controller.ts      # API endpoints
├── rbac.module.ts               # DI & imports
├── user-role.service.ts         # Lấy roles khi login
├── role.entity.ts               # DB model
├── permission.entity.ts         # DB model
├── role-permission.entity.ts    # DB model
├── membership.entity.ts         # DB model
├── user-role.entity.ts          # DB model
├── audit-log.entity.ts          # DB model
└── repositories/                # Data access layer
    ├── role.repository.ts
    ├── permission.repository.ts
    ├── role-permission.repository.ts
    ├── membership.repository.ts
    └── user-role.repository.ts
```

---

### 🎓 Khái Niệm Cơ Bản

#### **Role (Vai Trò)**

Role là một tập hợp permissions gán cho user

```
Role SUPER_ADMIN:            Role STAFF:
├─ invoice:read              ├─ invoice:read
├─ invoice:write             └─ (chỉ xem)
├─ invoice:delete
├─ user:read
├─ user:write
└─ user:delete

Role SCOPE:
├─ GLOBAL: SUPER_ADMIN, ADMIN (toàn bộ hệ thống)
└─ ORG: ORG_ADMIN, MANAGER (trong tổ chức)
```

#### **Permission (Quyền Hạn)**

Permission là một hành động cụ thể

```
Dạng: {module}:{action}

Ví dụ:
- invoice:read    (xem hóa đơn)
- invoice:write   (sửa hóa đơn)
- invoice:delete  (xóa hóa đơn)
- user:read       (xem user)
- user:admin      (quản lý user)
```

#### **Relationship (Liên Kết)**

```
User
  │
  ├─ has many UserRole (Global roles)
  │  └─ SUPER_ADMIN
  │  └─ ADMIN
  │
  └─ has many Membership (Organization roles)
     └─ Org A → ORG_ADMIN
     └─ Org B → MANAGER

Role ─── has many ─── Permission
(via RolePermission table)

Example:
ORG_ADMIN ─→ [invoice:*, user:*, report:*]
MANAGER ─→ [invoice:read, invoice:write, report:read]
STAFF ─→ [invoice:read]
```

---

### ✏️ **File 1: role.entity.ts** - Model Role

**Mục đích:** Định nghĩa bảng roles trong database

```typescript
@Entity roles {
  id: UUID
  scope: 'GLOBAL' | 'ORG'
    // GLOBAL: SUPER_ADMIN, ADMIN (toàn bộ hệ thống)
    // ORG: ORG_ADMIN, MANAGER, STAFF (trong tổ chức)

  orgId: UUID? (nullable nếu scope=GLOBAL)
    // Chỉ dùng khi scope=ORG
    // Foreign key → organizations

  name: string (e.g., "SUPER_ADMIN", "MANAGER")
  description: string? (mô tả role)

  // Relationships:
  rolePermissions: RolePermission[]  // Quyền của role này
  memberships: Membership[]          // User có role này trong org
  userRoles: UserRole[]              // User có role này (global)

  // Unique constraint: (scope, orgId, name)
  // → Không trùng role trong cùng scope + org
}

// Ví dụ dữ liệu:
[
  {id: "111", scope: "GLOBAL", orgId: null, name: "SUPER_ADMIN"},
  {id: "222", scope: "GLOBAL", orgId: null, name: "ADMIN"},
  {id: "333", scope: "ORG", orgId: "org-a", name: "ORG_ADMIN"},
  {id: "444", scope: "ORG", orgId: "org-a", name: "MANAGER"}
]
```

---

### ✏️ **File 2: permission.entity.ts** - Model Permission

**Mục đích:** Định nghĩa bảng permissions trong database

```typescript
@Entity permissions {
  id: UUID

  code: string UNIQUE (e.g., "invoice:read")
    // Dạng: {module}:{action}
    // Ví dụ: invoice:read, invoice:write, user:delete

  module: string (e.g., "invoice", "user", "crm")
    // Nhóm permissions theo module/feature

  description: string?

  // Relationships:
  rolePermissions: RolePermission[]
}

// Ví dụ dữ liệu:
[
  {code: "invoice:read", module: "invoice", description: "Xem hóa đơn"},
  {code: "invoice:write", module: "invoice", description: "Sửa hóa đơn"},
  {code: "invoice:delete", module: "invoice", description: "Xóa hóa đơn"},
  {code: "user:read", module: "user", description: "Xem user"},
  {code: "user:write", module: "user", description: "Sửa user"},
]
```

---

### ✏️ **File 3: role-permission.entity.ts** - Liên Kết Role-Permission

**Mục đích:** Bảng junction định nghĩa permissions của mỗi role

```typescript
@Entity role_permissions {
  // Composite Primary Key
  roleId: UUID (FK → roles)
  permissionId: UUID (FK → permissions)

  // Relationships:
  role: Role
  permission: Permission
}

// Ví dụ dữ liệu:
[
  {roleId: "111-SUPER_ADMIN", permissionId: "invoice:read"},
  {roleId: "111-SUPER_ADMIN", permissionId: "invoice:write"},
  {roleId: "111-SUPER_ADMIN", permissionId: "invoice:delete"},
  {roleId: "444-MANAGER", permissionId: "invoice:read"},
  {roleId: "444-MANAGER", permissionId: "invoice:write"}
]

// Hiểu là:
// SUPER_ADMIN có tất cả permissions
// MANAGER chỉ có read + write
```

---

### ✏️ **File 4: user-role.entity.ts** - Global Roles của User

**Mục đích:** Liên kết User ↔ Global Role

```typescript
@Entity user_roles {
  id: UUID

  userId: UUID (FK → users)
  roleId: UUID (FK → roles)
    // roleId phải là GLOBAL scope

  assignedAt: TIMESTAMP (khi gán)

  // Relationships:
  user: User
  role: Role

  // Unique constraint: (userId, roleId)
}

// Ví dụ:
[
  {userId: "user-1", roleId: "111-SUPER_ADMIN", assignedAt: "2026-01-01"},
  {userId: "user-2", roleId: "222-ADMIN", assignedAt: "2026-01-02"}
]

// Hiểu là:
// user-1 là SUPER_ADMIN (toàn bộ hệ thống)
// user-2 là ADMIN (toàn bộ hệ thống)
```

---

### ✏️ **File 5: membership.entity.ts** - Organization Roles

**Mục đích:** Liên kết User ↔ Organization ↔ Role

```typescript
@Entity memberships {
  id: UUID

  orgId: UUID (FK → organizations)
  userId: UUID (FK → users)
  roleId: UUID (FK → roles)
    // roleId phải là ORG scope

  status: NUMBER (1=active, 0=inactive)
  joinedAt: TIMESTAMP (khi join)

  // Relationships:
  organization: Organization
  user: User
  role: Role?

  // Unique constraint: (orgId, userId)
  // → 1 user chỉ có 1 membership/org
}

// Ví dụ:
[
  {orgId: "org-a", userId: "user-1", roleId: "333-ORG_ADMIN"},
  {orgId: "org-a", userId: "user-2", roleId: "444-MANAGER"},
  {orgId: "org-b", userId: "user-1", roleId: "444-MANAGER"},
  {orgId: "org-b", userId: "user-3", roleId: "333-ORG_ADMIN"}
]

// Hiểu là:
// user-1: org-a (ORG_ADMIN), org-b (MANAGER)
// user-2: org-a (MANAGER)
// user-3: org-b (ORG_ADMIN)
```

---

### ✏️ **File 6: rbac.service.ts** - Business Logic

**Mục đích:** Xử lý logic quản lý roles & permissions

#### **A. ROLE Management**

```typescript
async createRole(dto: CreateRoleDto):
  // Tạo role mới
  // Input: {scope, orgId?, name, description}
  // Validate: scope chỉ được GLOBAL hoặc ORG
  // Validate: nếu scope=ORG thì orgId bắt buộc
  // Trả về: role mới

async listRoles():
  // Lấy tất cả roles
  // Trả về: []

async updateRole(id: string, dto: UpdateRoleDto):
  // Sửa role
  // Có thể sửa: name, description

async deleteRole(id: string):
  // Xóa role
  // Validate: role không được dùng bởi user nào
```

#### **B. PERMISSION Management**

```typescript
async createPermission(dto: CreatePermissionDto):
  // Tạo permission mới
  // Input: {code, module, description}
  // Validate: code phải unique
  // Trả về: permission mới

async listPermissions():
  // Lấy tất cả permissions
  // Trả về: []
```

#### **C. ROLE_PERMISSION Assignment**

```typescript
async assignRolePermission(dto: AssignRolePermissionDto):
  // Gán permission vào role
  // Input: {roleId, permissionId}
  // Validate: role & permission tồn tại
  // Validate: chưa gán trước đó
  // Clear cache: của tất cả users có role này
  // Trả về: role-permission mới

async removeRolePermission(dto):
  // Xóa permission khỏi role
  // Input: {roleId, permissionId}
  // Clear cache: của tất cả users có role này
```

#### **D. MEMBERSHIP (Org Roles)**

```typescript
async assignMembership(dto: AssignMembershipDto):
  // Gán user vào org với role
  // Input: {userId, orgId, roleId}
  // Validate: orgId bắt buộc
  // Validate: user & role tồn tại
  // Validate: chưa assign trước đó
  // Clear cache: của user
  // Trả về: membership mới

async listMembershipsByUser(userId):
  // Lấy tất cả org của user
  // Trả về: [{orgId, roleId, ...}, ...]

async listMembershipsByOrg(orgId):
  // Lấy tất cả user trong org
  // Trả về: [{userId, roleId, ...}, ...]
```

#### **E. GLOBAL ROLES (User Roles)**

```typescript
async assignGlobalRole(userId, roleId):
  // Gán global role cho user
  // Input: {userId, roleId}
  // Validate: role phải scope=GLOBAL
  // Validate: chưa assign trước đó
  // Clear cache: JWT roles
  // Trả về: user-role mới

async removeGlobalRole(userId, roleId):
  // Xóa global role của user

async getUserGlobalRoles(userId):
  // Lấy danh sách global roles
  // Trả về: ["SUPER_ADMIN", "ADMIN"]

async listUsersByGlobalRole(roleId):
  // Lấy danh sách users có role này
  // Trả về: [userId, userId, ...]
```

#### **F. Cache Clearing**

```typescript
private async clearCacheForUser(userId):
  // Xóa 2 caches của user:
  // 1. "perm:global:user:{userId}" (permissions)
  // 2. "jwt:roles:{userId}" (JWT roles)

private async clearCacheForRole(roleId):
  // Lấy danh sách users có role này
  // Gọi clearCacheForUser() cho mỗi user
```

---

### ✏️ **File 7: user-role.service.ts** - Helper Service

**Mục đích:** Service helper để lấy roles khi login

```typescript
async getUserGlobalRoles(userId):
  // Lấy tất cả global roles của user
  // Được gọi bởi AuthService.login()
  // Trả về: role names ["SUPER_ADMIN", "ADMIN"]
  // (được encode vào JWT)

async assignGlobalR ole(userId, roleId):
  // Gán global role cho user

async removeGlobalRole(userId, roleId):
  // Xóa global role

async hasGlobalRole(userId, roleId):
  // Kiểm user có role không?
  // Trả về: boolean

async getUsersByGlobalRole(roleId):
  // Lấy danh sách users có role
  // Trả về: [userId, userId, ...]
```

---

### ✏️ **File 8: audit-log.entity.ts** - Ghi Log Thay Đổi

**Mục đích:** Lưu trữ activity log (ai làm gì khi nào)

```typescript
@Entity audit_logs {
  id: UUID

  action: string (e.g., "CREATE_ROLE", "ASSIGN_PERMISSION")
  resourceType: string (e.g., "Role", "Permission")
  resourceId: UUID

  changes: JSONB (thay đổi trước/sau)

  actor: User (ai làm)
  actorMembership: Membership? (trong org nào)

  createdAt: TIMESTAMP

  // Lợi ích:
  // ✓ Audit trail: ai làm gì
  // ✓ Compliance: theo dõi thay đổi
  // ✓ Debug: tìm root cause của issue
}
```

---

## 🔄 Luồng Xác Thực & Phân Quyền

### Quy Trình Đầu Tiên: ĐĂNG NHẬP → QUYỀN HẠN

```
┌───────────────────────────────────────────────┐
│ 1. USER REGISTER (POST /auth/register)       │
├───────────────────────────────────────────────┤
│ [Client]                                      │
│ ├─ Request OTP (email)                       │
│ │  └─ Server: gửi OTP qua email              │
│ ├─ Verify OTP (email, otp)                   │
│ │  └─ Server: tạo flag "verified"            │
│ └─ Register (email, password, fullName)      │
│    └─ Server: tạo user, xóa flag             │
│                                               │
│ [Database]                                    │
│ users table:                                  │
│   {id, email, passwordHash, fullName, ...}   │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ 2. USER LOGIN (POST /auth/login)              │
├───────────────────────────────────────────────┤
│ [Client]
│ Input: {email, password}
│
│ [AuthService.login()]
│ ├─ validateUser(email, password)
│ │  ├─ userRepo.findOne({email})
│ │  ├─ bcrypt.compare(password, hash) ✓
│ │  └─ Trả về user
│ ├─ signTokens(user)
│ │  ├─ getUserGlobalRoles(userId)
│ │  │  └─ Query: user_roles → roles
│ │  │     kết quả: ["SUPER_ADMIN"]
│ │  ├─ Create JWT payload:
│ │  │  {
│ │  │    sub: userId,
│ │  │    email: user@email.com,
│ │  │    roles: ["SUPER_ADMIN"]  ← Từ DB
│ │  │  }
│ │  ├─ accessToken = jwt.sign(payload, secret)
│ │  │  (expires: 15 phút)
│ │  ├─ refreshToken = jwt.sign(payload, secret)
│ │  │  (expires: 30 ngày)
│ │  └─ refreshTokenRepo.save(hash)
│ │     (lưu hash vào DB)
│ └─ Trả về: {user, accessToken, refreshToken}
│
│ [Response]
│ Status: 200
│ Headers:
│   Set-Cookie: access_token=jwt...
│   Set-Cookie: refresh_token=jwt...
│ Body: {id, email, fullName}
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ 3. REQUEST DENGAN TOKEN (GET /api/profile)   │
├───────────────────────────────────────────────┤
│ [Client Request]
│ GET /api/profile
│ Cookie: access_token=jwt...
│ Guard: @UseGuards(JwtAuthGuard)
│
│ [JwtAuthGuard]
│ ├─ JwtStrategy.validate()
│ │  ├─ Lấy token từ cookie
│ │  ├─ jwt.verify(token, secret) ✓
│ │  └─ Decode: {sub, email, roles}
│ └─ req.user = {id, email, roles}
│
│ [RolesGuard] (nếu có)
│ ├─ requiredRoles = ["ADMIN"]
│ ├─ userRoles = req.user.roles = ["SUPER_ADMIN"]
│ ├─ if (userRoles.includes("SUPER_ADMIN")) ✓
│ └─ BYPASS (SUPER_ADMIN luôn được phép)
│
│ [PermissionGuard] (nếu có)
│ ├─ requiredPerms = ["invoice:write"]
│ ├─ cacheKey = "perm:global:user:abc123"
│ ├─ cached = redis.get(cacheKey)
│ │  ├─ Nếu HIT: dùng cached
│ │  └─ Nếu MISS: query DB
│ │     * Lấy roles
│ │     * Lấy permissions của role
│ │     * Lưu vào cache 5 phút
│ ├─ permCodes = ["invoice:read", "invoice:write", ...]
│ ├─ requiredPerms.some(p => permCodes.includes(p)) ✓
│ └─ OK
│
│ [Handler]
│ Gọi @Get('profile') handler
│ Trả về 200: {id, email, profileData}
└───────────────────────────────────────────────┘
```

---

### Quy Trình: REFRESH TOKEN

```
┌───────────────────────────────────────────────┐
│ CLIENT: Access Token Hết Hạn                 │
├───────────────────────────────────────────────┤
│ GET /api/profile
│ Cookie: access_token=expired...
│
│ [JwtAuthGuard]
│ ├─ jwt.verify(token, secret) ✗
│ └─ Token expired → 401 Unauthorized
│
│ [Client nhận 401]
│ ├─ Biết access token hết hạn
│ └─ Gọi: POST /auth/refresh
│    Cookie: refresh_token=jwt...
│
│ [AuthService.refresh()]
│ ├─ payload = jwt.verify(refreshToken, refreshSecret)
│ ├─ user = userRepo.findOne({id: payload.sub})
│ ├─ tokens = refreshTokenRepo.find({userId, revokedAt: null})
│ ├─ for (each token):
│ │  ├─ isMatch = bcrypt.compare(refreshTokenRaw, token.hash)
│ │  ├─ if (!isMatch) continue
│ │  ├─ if (isExpired) continue
│ │  └─ if (OK) {matched = true; break}
│ │
│ ├─ if (!matched) throw "Refresh token invalid"
│ └─ return signTokens(user)  // Tạo token mới
│
│ [Response]
│ Set-Cookie: access_token=jwt_new...
│ Set-Cookie: refresh_token=jwt_new...
│
│ [Client]
│ ├─ Retry request cũ với token mới
│ └─ GET /api/profile ✓ 200 OK
└───────────────────────────────────────────────┘
```

---

### Quy Trình: LOGOUT

```
┌───────────────────────────────────────────────┐
│ USER: LOGOUT (POST /auth/logout)             │
├───────────────────────────────────────────────┤
│ [Client]
│ POST /auth/logout
│ Guard: @UseGuards(JwtAuthGuard)
│
│ [AuthService.logout(userId)]
│ ├─ refreshTokenRepo.update(
│ │    {userId, revokedAt: null},
│ │    {revokedAt: new Date()}
│ │  )
│ │  → Đánh dấu tất cả refresh token là "revoked"
│ │
│ ├─ res.clearCookie('access_token')
│ │  res.clearCookie('refresh_token')
│ │  → Xóa cookies ở client
│ │
│ └─ Return: {message: "Đăng xuất thành công"}
│
│ [Client]
│ ├─ Nhận response 200
│ ├─ Cookies đã xóa
│ └─ Lần sau request sẽ không có token
│    → Server trả 401 → Redirect login
└───────────────────────────────────────────────┘
```

---

## 📚 Ví Dụ Thực Tế

### Ví Dụ 1: Flow Đầy Đủ - Người Dùng Mới Đăng Ký

```
BƯỚC 1: Request OTP
POST /auth/request-otp
{email: "john@example.com"}

[Server]
- Kiểm email chưa tồn tại ✓
- Tạo OTP: 123456
- Lưu Redis: key="verify:email:john@example.com", value="123456", TTL=5min
- Gửi email OTP

Response:
{message: "OTP đã được gửi..."}

---

BƯỚC 2: Verify OTP
POST /auth/verify-otp
{email: "john@example.com", otp: "123456"}

[Server]
- Lấy OTP từ Redis ✓
- So sánh: "123456" === "123456" ✓
- Tạo flag: key="verified:email:john@example.com", value="true", TTL=30min
- Xóa OTP cũ: del("verify:email:john@example.com")

Response:
{message: "Email verified. You can now register."}

---

BƯỚC 3: Register
POST /auth/register
{
  email: "john@example.com",
  password: "myPassword123",
  fullName: "John Doe"
}

[Server]
- Kiểm flag verified tồn tại ✓
- Hash password: bcrypt.hash("myPassword123", 10)
  → $2b$10$sdfghjkl...
- Tạo user: {
    id: "uuid-1",
    email: "john@example.com",
    passwordHash: "$2b$10$...",
    fullName: "John Doe",
    status: 1,
    timezone: "Asia/Ho_Chi_Minh",
    defaultCurrency: "VND"
  }
- Lưu vào DB
- Xóa flag: del("verified:email:john@example.com")

Response:
{
  statusCode: 201,
  data: {id: "uuid-1", email: "john@example.com"}
}

---

BƯỚC 4: Login
POST /auth/login
{
  email: "john@example.com",
  password: "myPassword123"
}

[Server - AuthService.login()]

1. validateUser():
   - Tìm user: SELECT * FROM users WHERE email="john@example.com"
   - So sánh password:
     bcrypt.compare("myPassword123", "$2b$10$...") ✓
   - Kiểm status: status === 1 ✓
   - Return: user object

2. signTokens():
   a) getUserGlobalRoles("uuid-1"):
      - Query: SELECT r.name FROM user_roles ur
               JOIN roles r ON ur.role_id = r.id
               WHERE ur.user_id = "uuid-1"
      - Result: ["STAFF"] (hoặc [])

   b) Create JWT payload:
      {
        sub: "uuid-1",
        email: "john@example.com",
        roles: ["STAFF"]
      }

   c) Create access token:
      accessToken = jwt.sign(payload, "secret-key")
      (expires: 15 phút)

   d) Create refresh token:
      refreshToken = jwt.sign(payload, "refresh-secret")
      (expires: 30 ngày)

   e) Save refresh token hash:
      INSERT INTO refresh_tokens VALUES {
        id: "uuid-rt-1",
        user_id: "uuid-1",
        token: "$2b$10$...(hash của refreshToken)",
        expires_at: "2026-04-20T07:00:00Z",
        revoked_at: null
      }

3. Return: {
     user: {...},
     accessToken: "eyJhbGc...",
     refreshToken: "eyJhbGc..."
   }

[Response]
Status: 200
Headers:
  Set-Cookie: access_token=eyJhbGc...; HttpOnly; Path=/; ...
  Set-Cookie: refresh_token=eyJhbGc...; HttpOnly; Path=/; ...
Body: {
  statusCode: 200,
  data: {
    id: "uuid-1",
    email: "john@example.com",
    fullName: "John Doe"
  }
}

---

BƯỚC 5: Gọi API Có Bảo Vệ
GET /api/profile

[Client]
- Browser tự động gửi cookie:
  Cookie: access_token=eyJhbGc...

[Server - JwtAuthGuard]
1. JwtStrategy:
   - cookieExtractor() lấy token từ cookie
   - jwt.verify(token, "secret-key") ✓
   - Decode payload: {sub: "uuid-1", email: "...", roles: ["STAFF"]}

2. validate(payload):
   - Return: {
       id: "uuid-1",
       email: "john@example.com",
       roles: ["STAFF"]
     }

3. req.user = {...}

[Handler]
@Get('profile')
getProfile(@CurrentUser() user) {
  return {
    id: user.id,
    email: user.email,
    fullName: "John Doe"
  }
}

[Response]
200 OK: {id: "uuid-1", ...}
```

---

### Ví Dụ 2: Permission Check Flow

```
REQUEST: DELETE /api/invoices/123

@UseGuards(JwtAuthGuard, PermissionGuard)
@Permissions('invoice:delete', 'admin:all')
@Delete(':id')
deleteInvoice(@Param('id') id: string) {
  // Xóa invoice
}

---

[1] JwtAuthGuard Pass
req.user = {
  id: "user-1",
  email: "staff@company.com",
  roles: ["STAFF"]
}

---

[2] PermissionGuard Check

Step 1: SUPER_ADMIN Bypass?
- user.roles.includes('SUPER_ADMIN')? NO
- Continue...

Step 2: Check Cache
- cacheKey = "perm:global:user:user-1"
- cached = await redis.get(cacheKey)
- Cache MISS (hoặc empty) → Query DB

Step 3: Query DB
a) Get memberships:
   SELECT * FROM memberships WHERE user_id = "user-1"
   Result: []  (user không trong org nào)

b) Get roleIds:
   roleIds = [] (không có membership role)

c) Get role_permissions:
   SELECT * FROM role_permissions WHERE role_id IN ([])
   Result: []

d) Get permissions:
   Vì user là STAFF → global role
   Query từ user_roles:

   SELECT rp.permission_id FROM role_permissions rp
   JOIN user_roles ur ON rp.role_id = ur.role_id
   WHERE ur.user_id = "user-1"

   Result: ["invoice:read"]  (STAFF chỉ có read)

e) Create permCodes:
   permCodes = ["invoice:read"]

Step 4: Save Cache
- await redis.set(cacheKey, ["invoice:read"], 300s)

Step 5: Check Permission
- requiredPerms = ['invoice:delete', 'admin:all']
- requiredPerms.some(p => ["invoice:read"].includes(p))? NO

---

Result: 403 Forbidden
{
  statusCode: 403,
  message: "Insufficient permissions"
}
```

---

### Ví Dụ 3: Organization Roles

```
Scenario:
- John là user
- Công ty A: John là ORG_ADMIN
- Công ty B: John là MANAGER

---

ASSIGN MEMBERSHIP:
POST /api/rbac/memberships/assign
{
  userId: "john-id",
  orgId: "org-a",
  roleId: "org-admin-role-id"
}

[RbacService.assignMembership()]
- Kiểm user & role tồn tại ✓
- Kiểm chưa assign trước ✓
- INSERT: memberships {orgId: org-a, userId: john-id, roleId: org-admin}
- Clear cache: clearCacheForUser("john-id")

---

GET /api/orgs/org-a/data
(Trong org A - John là ORG_ADMIN)

[PermissionGuard]
- Query memberships: [{orgId: org-a, roleId: org-admin}]
- Get role_permissions cho org-admin
  → Có permission: 'org:admin', 'user:write', ...
- user có permission cần thiết ✓
- Allow

---

GET /api/orgs/org-b/data
(Trong org B - John là MANAGER)

[PermissionGuard]
- Query memberships: [{orgId: org-b, roleId: manager}]
- Get role_permissions cho manager
  → Có permission: 'user:read', 'data:read' (không có admin)
- Nếu endpoint cần 'org:admin' → 403
- Nếu endpoint cần 'user:read' → 200
```

---

## 📊 Tóm Tắt So Sánh

| Khía Cạnh      | AUTH                 | RBAC                      |
| -------------- | -------------------- | ------------------------- |
| **Mục đích**   | Xác thực danh tính   | Phân quyền hạn            |
| **Công nghệ**  | JWT, OTP, Bcrypt     | Database, Role-Permission |
| **Người dùng** | Ai bạn là?           | Bạn được làm gì?          |
| **Cache**      | Token ở client       | Permission ở Redis        |
| **Lifetime**   | Tạm thời per request | Lâu dài, clear khi update |
| **Bypass**     | N/A                  | SUPER_ADMIN bypass        |

---

## 🎓 Best Practices

### ✅ DO

1. **Hash password & refresh token**

   ```typescript
   passwordHash = bcrypt.hash(password, 10);
   tokenHash = bcrypt.hash(token, 10);
   ```

2. **Validate mỗi request**

   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
   ```

3. **Cache permissions**
   - Tránh query DB mỗi request
   - TTL 5 phút là hợp lý

4. **Clear cache khi update role/permission**
   - Đảm bảo changes apply ngay

5. **Log all security events**
   - Ai đăng nhập khi nào
   - Ai update permission gì

### ❌ DON'T

1. **KHÔNG lưu password plain text**

   ```typescript
   ❌ user.password = password  // BAD
   ✅ user.passwordHash = bcrypt.hash(password, 10)
   ```

2. **KHÔNG lưu JWT token gốc ở DB**

   ```typescript
   ❌ token = refreshToken  // BAD
   ✅ token = bcrypt.hash(refreshToken, 10)
   ```

3. **KHÔNG để JWT trong query string**

   ```typescript
   ❌ GET /profile?token=jwt...  // BAD (visible in logs)
   ✅ PUT in HttpOnly Cookie
   ```

4. **KHÔNG skip validation**

   ```typescript
   ❌ await userRepo.save(user)  // Không validate
   ✅ await userRepo.save(await this.validate(user))
   ```

5. **KHÔNG cache permissions lâu quá**
   ```typescript
   ❌ TTL = 1 hour  // Quá lâu, changes không apply kịp
   ✅ TTL = 5 minutes
   ```

---

## 🔗 Liên Kết Giữa Auth & RBAC

```
   ┌──────────────────────────────────────┐
   │     CLIENT: USER NAVIGATES APP       │
   └──────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────┐
   │  AUTH: IDENTIFY USER (JWT)           │
   │  ✓ JwtAuthGuard verify token         │
   │  ✓ req.user = {id, email, roles}     │
   └──────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────┐
   │  RBAC: AUTHORIZE USER (Permission)   │
   │  ✓ RolesGuard check roles            │
   │  ✓ PermissionGuard check permissions │
   │  ✓ Clear/Set cache                   │
   └──────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────────────┐
   │     HANDLER: EXECUTE ACTION          │
   │     ✓ Delete user, Update invoice... │
   └──────────────────────────────────────┘
```

---

## 📖 Kết Luận

**AUTH Folder:**

- Quản lý đăng ký, đăng nhập, token
- Nơi xác thực "BẠN LÀ AI"
- Sử dụng: JWT, OTP, Bcrypt, Redis

**RBAC Folder:**

- Quản lý vai trò, quyền hạn
- Nơi phân quyền "BẠN ĐƯỢC LÀM GÌ"
- Sử dụng: Database, Roles, Permissions, Memberships

**Kết hợp:**

- Auth + RBAC = Bảo mật toàn diện
- Auth = Xác thực
- RBAC = Phân quyền
- Cả hai là bắt buộc cho hệ thống an toàn

---

**✨ Tài liệu này cung cấp hiểu biết toàn diện về hệ thống xác thực & phân quyền!**
