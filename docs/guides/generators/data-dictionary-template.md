# Data Dictionary Template

## วิธีใช้ Template นี้

1. Copy template นี้ไปไว้ใน `modules/[module-name]/database/data-dictionary.md`
2. แก้ไขข้อมูลตามความเหมาะสม
3. เพิ่ม Business Rules ที่สำคัญ
4. ระบุ API endpoints และ permissions

---

# [Module Name] Data Dictionary

## Overview

**Module**: [Module Name]  
**Version**: 1.0.0  
**Last Updated**: [Date]  
**Description**: [Brief description of the module]

## Database Tables

### [Table Name] Table

**Description**: [What this table stores]  
**Relationships**: [List related tables]

| Field        | Type   | Required | Default   | Description       | Example     | Notes       |
| ------------ | ------ | -------- | --------- | ----------------- | ----------- | ----------- |
| id           | String | Yes      | cuid()    | Unique identifier | "clh2x4..." | Primary Key |
| [field_name] | [type] | [Yes/No] | [default] | [description]     | [example]   | [notes]     |

### Indexes

- `@@index([field1])` - [reason for index]
- `@@index([field1, field2])` - [reason for compound index]

### Constraints

- `@@unique([field])` - [reason for uniqueness]
- Foreign Keys: [list foreign key relationships]

## Enums

### [Enum Name]

```typescript
enum [EnumName] {
  VALUE1  // Description
  VALUE2  // Description
}
```

## Business Rules

### 1. [Rule Category]

- **Rule**: [Description of the rule]
- **Implementation**: [How it's implemented]
- **Example**: [Example scenario]

### 2. Data Validation

- **Field**: [Validation rules]
- **Field**: [Validation rules]

### 3. State Transitions

```
[STATE1] → [STATE2] (conditions)
[STATE2] → [STATE3] (conditions)
```

### 4. Computed Fields

- **[field_name]**: [How it's calculated]

## API Endpoints

| Method | Endpoint                      | Description | Required Permissions | Rate Limit |
| ------ | ----------------------------- | ----------- | -------------------- | ---------- |
| GET    | /api/[module]/[resource]      | List all    | [module].view        | 100/min    |
| GET    | /api/[module]/[resource]/[id] | Get single  | [module].view        | 100/min    |
| POST   | /api/[module]/[resource]      | Create new  | [module].create      | 20/min     |
| PUT    | /api/[module]/[resource]/[id] | Update      | [module].update      | 20/min     |
| DELETE | /api/[module]/[resource]/[id] | Delete      | [module].delete      | 10/min     |

### Request/Response Examples

#### Create [Resource]

**Request**:

```json
POST /api/[module]/[resource]
{
  "field1": "value1",
  "field2": "value2"
}
```

**Response**:

```json
{
  "id": "clh2x4...",
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2024-08-04T10:00:00Z"
}
```

## Data Flow Diagrams

### Create Flow

```
User Input → Validation → Business Logic → Database → Response
     ↓                          ↓
  Error Response         Trigger Events
```

### Update Flow

```
Request → Load Entity → Check Permissions → Validate Changes → Update → Response
                ↓                                      ↓
         Not Found Error                    Validation Error
```

## Performance Considerations

### Query Optimization

- **Common Queries**: [List common query patterns]
- **Indexes**: [Why each index exists]
- **Caching Strategy**: [What gets cached and TTL]

### Data Volume Expectations

- **[Table]**: ~[expected rows] rows
- **Growth Rate**: [expected growth]
- **Archival Strategy**: [when/how to archive]

## Security Considerations

### Access Control

- **Read Access**: [Who can read]
- **Write Access**: [Who can write]
- **Delete Access**: [Who can delete]

### Sensitive Data

- **[field]**: [How it's protected - encryption, hashing, etc.]

### Audit Trail

- **Created By**: Tracked via `createdById`
- **Updated By**: Tracked via `updatedById`
- **Change History**: [How changes are logged]

## Integration Points

### External Systems

- **[System Name]**: [How it integrates]

### Internal Dependencies

- **[Module Name]**: [Relationship/dependency]

### Events/Webhooks

- **[Event Name]**: Triggered when [condition]

## Migration Notes

### From Version X to Y

- **Changes**: [What changed]
- **Migration Script**: [Location of script]
- **Rollback Plan**: [How to rollback]

## Sample Data (for Testing)

```typescript
// Minimal valid record
{
  field1: "value1",
  field2: "value2"
}

// Full record with all fields
{
  id: "test-id-001",
  field1: "value1",
  field2: "value2",
  // ... all fields
}
```

## FAQ / Common Issues

### Q: [Common question]

**A**: [Answer with example]

### Q: [Common question]

**A**: [Answer with example]

---

## Appendix

### Related Documentation

- [Link to API docs]
- [Link to UI components]
- [Link to business requirements]

### Change Log

| Date   | Version | Changes         | Author |
| ------ | ------- | --------------- | ------ |
| [Date] | 1.0.0   | Initial version | [Name] |
