# Error Messages — English

This document describes all possible validation error types returned by the API, their causes, and i18n message templates with interpolation parameters.

---

## Response Structure

All errors share the same response envelope:

```json
{
  "status": "422",
  "is_successes": false,
  "message": "...",
  "error": [
    {
      "code": "422",
      "error_type": "pandera | pydantic | constraint validation",
      "title": "<schema_or_model_name>",
      "error_count": 3,
      "message": "3 validation errors for preOrder",
      "detail": [
        {
          "location": [<row_index_or_null>, "<column_or_field>"],
          "type": "<error_type_key>",
          "message": "<raw_check_description>",
          "input": <actual_value>,
          "input_type": "string | float | integer | ...",
          "context": { ... }
        }
      ]
    }
  ]
}
```

> **`location[0]`** = `null` means the error is at the **whole-column level** (e.g. wrong dtype).
> **`location[0]`** = number means the error is at a **specific row**.

---

## All Errors Summary

| `error_type` | `type` (i18n key) | Message (EN) | Message (TH) | Parameters |
|---|---|---|---|---|
| `pandera` | `val_column_in_dataframe` | Column `{{location[1]}}` is missing from the file | ไม่พบคอลัมน์ `{{location[1]}}` ในไฟล์ | `location[1]` |
| `pandera, pydantic` | `val_missing` | `{{location[1]}}` is missing or null at row `{{location[0]}}` | `{{location[1]}}` มีค่าว่าง (null) หรือไม่พบข้อมูล ที่แถว `{{location[0]}}` | `location[0]`, `location[1]` |
| `pandera` | `val_greater_than` | Value `{{input}}` in column `{{location[1]}}` must be greater than `{{context.limitValue}}` | ค่า `{{input}}` ในคอลัมน์ `{{location[1]}}` ต้องมากกว่า `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `pandera, pydantic` | `val_greater_than_equal` | Value `{{input}}` for `{{location[1]}}` must be ≥ `{{context.limitValue}}` | ค่า `{{input}}` ของ `{{location[1]}}` ต้องมากกว่าหรือเท่ากับ `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `pandera` | `val_float_type` | Column `{{location[1]}}` expects a numeric (float) value but received type `{{input}}` | คอลัมน์ `{{location[1]}}` ต้องการข้อมูลประเภทตัวเลข (float) แต่ได้รับประเภท `{{input}}` | `location[1]`, `input` |
| `pandera` | `val_datetime_type` | Column `{{location[1]}}` expects a date/time value but received type `{{input}}` | คอลัมน์ `{{location[1]}}` ต้องการข้อมูลประเภทวันที่-เวลา แต่ได้รับประเภท `{{input}}` | `location[1]`, `input` |
| `pandera` | `val_datetime_parsing` | Cannot parse `{{input}}` as a date in column `{{location[1]}}` | ไม่สามารถแปลงค่า `{{input}}` เป็นวันที่ในคอลัมน์ `{{location[1]}}` ได้ | `location[1]`, `input` |
| `pandera` | `val_str_matches` | Value `{{input}}` in column `{{location[1]}}` does not match the required format (e.g. `13.75, 100.51`) | ค่า `{{input}}` ในคอลัมน์ `{{location[1]}}` ไม่ตรงกับรูปแบบที่กำหนด (เช่น `13.75, 100.51`) | `location[1]`, `input` |
| `pandera` | `val_check_error` | Column `{{location[1]}}` could not be checked because the data type is invalid | ไม่สามารถตรวจสอบคอลัมน์ `{{location[1]}}` ได้ เนื่องจากประเภทข้อมูลไม่ถูกต้อง | `location[1]` |
| `pydantic` | `val_less_than_equal` | Field `{{location[1]}}` value `{{input}}` must be ≤ `{{context.limitValue}}` | ฟิลด์ `{{location[1]}}` ค่า `{{input}}` ต้องน้อยกว่าหรือเท่ากับ `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `pydantic` | `val_float_parsing` | Cannot parse `{{input}}` as a number for field `{{location[1]}}` | ไม่สามารถแปลงค่า `{{input}}` เป็นตัวเลขสำหรับฟิลด์ `{{location[1]}}` ได้ | `location[1]`, `input` |
| `pydantic` | `val_value_error` | Invalid value for field `{{location[1]}}`: `{{message}}` | ค่าไม่ถูกต้องสำหรับฟิลด์ `{{location[1]}}`: `{{message}}` | `location[1]`, `message` |
| `constraint validation` | `bus_hard_constraint_weight` | Customer at row `{{location[0]}}` — order weight `{{input}}` exceeds all vehicle capacity limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — น้ำหนักสินค้า `{{input}}` เกินความจุสูงสุดของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_hard_constraint_volume` | Customer at row `{{location[0]}}` — order volume `{{input}}` exceeds all vehicle volume limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — ปริมาตรสินค้า `{{input}}` เกินขีดจำกัดปริมาตรของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_hard_constraint_distance` | Customer at row `{{location[0]}}` — route distance `{{input}}` exceeds all vehicle max distance limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — ระยะทาง `{{input}}` เกินระยะทางสูงสุดของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_hard_constraint_duration` | Customer at row `{{location[0]}}` — route duration `{{input}}` exceeds all vehicle max duration limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — เวลาเดินทาง `{{input}}` เกินเวลาสูงสุดของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_soft_constraint_weight` | Warning: Customer at row `{{location[0]}}` — order weight `{{input}}` exceeds soft weight limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — น้ำหนักสินค้า `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_soft_constraint_volume` | Warning: Customer at row `{{location[0]}}` — order volume `{{input}}` exceeds soft volume limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — ปริมาตรสินค้า `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_soft_constraint_distance` | Warning: Customer at row `{{location[0]}}` — route distance `{{input}}` exceeds soft distance limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — ระยะทาง `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_soft_constraint_duration` | Warning: Customer at row `{{location[0]}}` — route duration `{{input}}` exceeds soft duration limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — เวลาเดินทาง `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `constraint validation` | `bus_missing_vehicle_groups` | Customer at row `{{location[0]}}` — required vehicle group `{{input}}` does not exist in the current vehicle configuration | ลูกค้าที่แถว `{{location[0]}}` — กลุ่มยานพาหนะ `{{input}}` ที่ต้องการไม่มีในระบบการกำหนดค่าปัจจุบัน | `location[0]`, `input` |

---

## i18n Message Table

> Parameters use `{{param}}` interpolation.
> All `type` keys map directly to your i18n key.

---

### Pandera Schema Errors (`error_type: "pandera"`)

Triggered when input Excel files fail column/type/value checks.

| `type` (i18n key) | Message (EN) | Message (TH) | Parameters |
|---|---|---|---|
| `val_column_in_dataframe` | Column `{{location[1]}}` is missing from the file | ไม่พบคอลัมน์ `{{location[1]}}` ในไฟล์ | `location[1]` |
| `val_missing` | `{{location[1]}}` is missing or null at row `{{location[0]}}` | `{{location[1]}}` มีค่าว่าง (null) หรือไม่พบข้อมูล ที่แถว `{{location[0]}}` | `location[0]`, `location[1]` |
| `val_greater_than` | Value `{{input}}` in column `{{location[1]}}` must be greater than `{{context.limitValue}}` | ค่า `{{input}}` ในคอลัมน์ `{{location[1]}}` ต้องมากกว่า `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `val_greater_than_equal` | Value `{{input}}` for `{{location[1]}}` must be ≥ `{{context.limitValue}}` | ค่า `{{input}}` ของ `{{location[1]}}` ต้องมากกว่าหรือเท่ากับ `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `val_float_type` | Column `{{location[1]}}` expects a numeric (float) value but received type `{{input}}` | คอลัมน์ `{{location[1]}}` ต้องการข้อมูลประเภทตัวเลข (float) แต่ได้รับประเภท `{{input}}` | `location[1]`, `input` |
| `val_datetime_type` | Column `{{location[1]}}` expects a date/time value but received type `{{input}}` | คอลัมน์ `{{location[1]}}` ต้องการข้อมูลประเภทวันที่-เวลา แต่ได้รับประเภท `{{input}}` | `location[1]`, `input` |
| `val_datetime_parsing` | Cannot parse `{{input}}` as a date in column `{{location[1]}}` | ไม่สามารถแปลงค่า `{{input}}` เป็นวันที่ในคอลัมน์ `{{location[1]}}` ได้ | `location[1]`, `input` |
| `val_str_matches` | Value `{{input}}` in column `{{location[1]}}` does not match the required format (e.g. `13.75, 100.51`) | ค่า `{{input}}` ในคอลัมน์ `{{location[1]}}` ไม่ตรงกับรูปแบบที่กำหนด (เช่น `13.75, 100.51`) | `location[1]`, `input` |
| `val_check_error` | Column `{{location[1]}}` could not be checked because the data type is invalid | ไม่สามารถตรวจสอบคอลัมน์ `{{location[1]}}` ได้ เนื่องจากประเภทข้อมูลไม่ถูกต้อง | `location[1]` |

#### Examples

| `type` | Example (EN) | Example (TH) | `json_data` |
|---|---|---|---|
| `val_column_in_dataframe` | Column `LatLng` is missing from the file | ไม่พบคอลัมน์ `LatLng` ในไฟล์ | `{{"location": [null, "LatLng"], "type": "val_column_in_dataframe", "input": "LatLng", "input_type": "string", "context": {"type": "COLUMN_NOT_IN_DATAFRAME", "limitValue": null}}}` |
| `val_missing` | `NET_VOLUME (KG) / Piece` is missing or null at row `0` | `NET_VOLUME (KG) / Piece` มีค่าว่าง (null) หรือไม่พบข้อมูล ที่แถว `0` | `{{"location": [0, "NET_VOLUME (KG) / Piece"], "type": "val_missing", "input": null, "input_type": "float", "context": {"type": "SERIES_CONTAINS_NULLS", "limitValue": null}}}` |
| `val_greater_than` | Value `0` in column `InnerPack` must be greater than `0` | ค่า `0` ในคอลัมน์ `InnerPack` ต้องมากกว่า `0` | `{{"location": [0, "InnerPack"], "type": "val_greater_than", "input": 0, "input_type": "integer", "context": {"type": "DATAFRAME_CHECK", "limitValue": 0.0}}}` |
| `val_greater_than_equal` | Value `-1.0` for `Length` must be ≥ `0` | ค่า `-1.0` ของ `Length` ต้องมากกว่าหรือเท่ากับ `0` | `{{"location": [0, "Length"], "type": "val_greater_than_equal", "input": -1.0, "input_type": "float", "context": {"type": "DATAFRAME_CHECK", "limitValue": 0.0}}}` |
| `val_float_type` | Column `Height` expects a numeric (float) value but received type `object` | คอลัมน์ `Height` ต้องการข้อมูลประเภทตัวเลข (float) แต่ได้รับประเภท `object` | `{{"location": [null, "Height"], "type": "val_float_type", "input": "object", "input_type": "string", "context": {"type": "WRONG_DATATYPE", "limitValue": null}}}` |
| `val_datetime_type` | Column `DELIVERYDATE_CONFIRM` expects a date/time value but received type `object` | คอลัมน์ `DELIVERYDATE_CONFIRM` ต้องการข้อมูลประเภทวันที่-เวลา แต่ได้รับประเภท `object` | `{{"location": [null, "DELIVERYDATE_CONFIRM"], "type": "val_datetime_type", "input": "object", "input_type": "string", "context": {"type": "WRONG_DATATYPE", "limitValue": null}}}` |
| `val_datetime_parsing` | Cannot parse `test` as a date in column `DELIVERYDATE_CONFIRM` | ไม่สามารถแปลงค่า `test` เป็นวันที่ในคอลัมน์ `DELIVERYDATE_CONFIRM` ได้ | `{{"location": [0, "DELIVERYDATE_CONFIRM"], "type": "val_datetime_parsing", "input": "test", "input_type": "string", "context": {"type": "DATATYPE_COERCION", "limitValue": null}}}` |
| `val_str_matches` | Value `ABC123` in column `LatLng` does not match the required format (e.g. `13.75, 100.51`) | ค่า `ABC123` ในคอลัมน์ `LatLng` ไม่ตรงกับรูปแบบที่กำหนด (เช่น `13.75, 100.51`) | `{{"location": [0, "LatLng"], "type": "val_str_matches", "input": "ABC123", "input_type": "string", "context": {"type": "DATAFRAME_CHECK", "limitValue": null}}}` |
| `val_check_error` | Column `Height` could not be checked because the data type is invalid | ไม่สามารถตรวจสอบคอลัมน์ `Height` ได้ เนื่องจากประเภทข้อมูลไม่ถูกต้อง | `{{"location": [null, "Height"], "type": "val_check_error", "input": "object", "input_type": "string", "context": {"type": "CHECK_ERROR", "limitValue": 0.0}}}` |

---

### Pydantic Model Errors (`error_type: "pydantic"`)

Triggered when transformed data fails model field constraints (e.g. coordinate range, numeric parsing).

| `type` (i18n key) | Message (EN) | Message (TH) | Parameters |
|---|---|---|---|
| `val_less_than_equal` | Field `{{location[1]}}` value `{{input}}` must be ≤ `{{context.limitValue}}` | ฟิลด์ `{{location[1]}}` ค่า `{{input}}` ต้องน้อยกว่าหรือเท่ากับ `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `val_greater_than_equal` | Value `{{input}}` for `{{location[1]}}` must be ≥ `{{context.limitValue}}` | ค่า `{{input}}` ของ `{{location[1]}}` ต้องมากกว่าหรือเท่ากับ `{{context.limitValue}}` | `location[1]`, `input`, `context.limitValue` |
| `val_float_parsing` | Cannot parse `{{input}}` as a number for field `{{location[1]}}` | ไม่สามารถแปลงค่า `{{input}}` เป็นตัวเลขสำหรับฟิลด์ `{{location[1]}}` ได้ | `location[1]`, `input` |
| `val_missing` | `{{location[1]}}` is missing or null at row `{{location[0]}}` | `{{location[1]}}` มีค่าว่าง (null) หรือไม่พบข้อมูล ที่แถว `{{location[0]}}` | `location[0]`, `location[1]` |
| `val_value_error` | Invalid value for field `{{location[1]}}`: `{{message}}` | ค่าไม่ถูกต้องสำหรับฟิลด์ `{{location[1]}}`: `{{message}}` | `location[1]`, `message` |

#### Examples

| `type` | Example (EN) | Example (TH) | `json_data` |
|---|---|---|---|
| `val_less_than_equal` | Field `latitude` value `100` must be ≤ `90` | ฟิลด์ `latitude` ค่า `100` ต้องน้อยกว่าหรือเท่ากับ `90` | `{{"location": [0, "latitude"], "type": "val_less_than_equal", "input": 100, "input_type": "integer", "context": {"limitValue": 90.0}}}` |
| `val_greater_than_equal` | Value `-200` for `longitude` must be ≥ `-180` | ค่า `-200` ของ `longitude` ต้องมากกว่าหรือเท่ากับ `-180` | `{{"location": [0, "longitude"], "type": "val_greater_than_equal", "input": -200, "input_type": "integer", "context": {"limitValue": -180.0}}}` |
| `val_float_parsing` | Cannot parse `test` as a number for field `excess_weight` | ไม่สามารถแปลงค่า `test` เป็นตัวเลขสำหรับฟิลด์ `excess_weight` ได้ | `{{"location": [0, "metrics", "excess_weight"], "type": "val_float_parsing", "input": "test", "input_type": "string", "context": {"limitValue": null}}}` |
| `val_missing` | `ORDERID_ORG` is missing or null at row `0` | `ORDERID_ORG` มีค่าว่าง (null) หรือไม่พบข้อมูล ที่แถว `0` | `{{"location": [0, "ORDERID_ORG"], "type": "val_missing", "input": null, "input_type": null, "context": {"limitValue": null}}}` |
| `val_value_error` | Invalid value for field `status`: value is not a valid enum member | ค่าไม่ถูกต้องสำหรับฟิลด์ `status`: ค่าไม่ใช่สมาชิกที่ถูกต้องของ enum | `{{"location": [0, "status"], "type": "val_value_error", "input": "INVALID", "input_type": "string", "context": {"limitValue": null}}}` |

---

### Constraint Validation Errors (`error_type: "constraint validation"`)

Triggered during route validation when a customer order cannot be served by any available vehicle.

| `type` (i18n key) | Message (EN) | Message (TH) | Parameters |
|---|---|---|---|
| `bus_hard_constraint_weight` | Customer at row `{{location[0]}}` — order weight `{{input}}` exceeds all vehicle capacity limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — น้ำหนักสินค้า `{{input}}` เกินความจุสูงสุดของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_hard_constraint_volume` | Customer at row `{{location[0]}}` — order volume `{{input}}` exceeds all vehicle volume limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — ปริมาตรสินค้า `{{input}}` เกินขีดจำกัดปริมาตรของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_hard_constraint_distance` | Customer at row `{{location[0]}}` — route distance `{{input}}` exceeds all vehicle max distance limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — ระยะทาง `{{input}}` เกินระยะทางสูงสุดของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_hard_constraint_duration` | Customer at row `{{location[0]}}` — route duration `{{input}}` exceeds all vehicle max duration limits (max: `{{context.limits}}`) | ลูกค้าที่แถว `{{location[0]}}` — เวลาเดินทาง `{{input}}` เกินเวลาสูงสุดของยานพาหนะทุกคัน (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_soft_constraint_weight` | Warning: Customer at row `{{location[0]}}` — order weight `{{input}}` exceeds soft weight limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — น้ำหนักสินค้า `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_soft_constraint_volume` | Warning: Customer at row `{{location[0]}}` — order volume `{{input}}` exceeds soft volume limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — ปริมาตรสินค้า `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_soft_constraint_distance` | Warning: Customer at row `{{location[0]}}` — route distance `{{input}}` exceeds soft distance limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — ระยะทาง `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_soft_constraint_duration` | Warning: Customer at row `{{location[0]}}` — route duration `{{input}}` exceeds soft duration limit (max: `{{context.limits}}`) | คำเตือน: ลูกค้าที่แถว `{{location[0]}}` — เวลาเดินทาง `{{input}}` เกินขีดจำกัดแบบ soft (สูงสุด: `{{context.limits}}`) | `location[0]`, `input`, `context.limits` |
| `bus_missing_vehicle_groups` | Customer at row `{{location[0]}}` — required vehicle group `{{input}}` does not exist in the current vehicle configuration | ลูกค้าที่แถว `{{location[0]}}` — กลุ่มยานพาหนะ `{{input}}` ที่ต้องการไม่มีในระบบการกำหนดค่าปัจจุบัน | `location[0]`, `input` |

#### Examples

| `type` | Example (EN) | Example (TH) | `json_data` |
|---|---|---|---|
| `bus_hard_constraint_weight` | Customer at row `5` — order weight `1500.0` exceeds all vehicle capacity limits (max: `1000.0`) | ลูกค้าที่แถว `5` — น้ำหนักสินค้า `1500.0` เกินความจุสูงสุดของยานพาหนะทุกคัน (สูงสุด: `1000.0`) | `{{"location": [5, "weight"], "type": "bus_hard_constraint_weight", "input": 1500.0, "input_type": "float", "context": {"limits": 1000.0, "profile": [0]}}}` |
| `bus_hard_constraint_volume` | Customer at row `3` — order volume `2.5` exceeds all vehicle volume limits (max: `2.0`) | ลูกค้าที่แถว `3` — ปริมาตรสินค้า `2.5` เกินขีดจำกัดปริมาตรของยานพาหนะทุกคัน (สูงสุด: `2.0`) | `{{"location": [3, "volume"], "type": "bus_hard_constraint_volume", "input": 2.5, "input_type": "float", "context": {"limits": 2.0, "profile": [0]}}}` |
| `bus_hard_constraint_distance` | Customer at row `7` — route distance `350.0` exceeds all vehicle max distance limits (max: `300.0`) | ลูกค้าที่แถว `7` — ระยะทาง `350.0` เกินระยะทางสูงสุดของยานพาหนะทุกคัน (สูงสุด: `300.0`) | `{{"location": [7, "distance"], "type": "bus_hard_constraint_distance", "input": 350.0, "input_type": "float", "context": {"limits": 300.0, "profile": [1]}}}` |
| `bus_hard_constraint_duration` | Customer at row `2` — route duration `520.0` exceeds all vehicle max duration limits (max: `480.0`) | ลูกค้าที่แถว `2` — เวลาเดินทาง `520.0` เกินเวลาสูงสุดของยานพาหนะทุกคัน (สูงสุด: `480.0`) | `{{"location": [2, "duration"], "type": "bus_hard_constraint_duration", "input": 520.0, "input_type": "float", "context": {"limits": 480.0, "profile": [0]}}}` |
| `bus_soft_constraint_weight` | Warning: Customer at row `4` — order weight `950.0` exceeds soft weight limit (max: `900.0`) | คำเตือน: ลูกค้าที่แถว `4` — น้ำหนักสินค้า `950.0` เกินขีดจำกัดแบบ soft (สูงสุด: `900.0`) | `{{"location": [4, "weight"], "type": "bus_soft_constraint_weight", "input": 950.0, "input_type": "float", "context": {"limits": 900.0, "profile": [0]}}}` |
| `bus_soft_constraint_volume` | Warning: Customer at row `1` — order volume `1.9` exceeds soft volume limit (max: `1.8`) | คำเตือน: ลูกค้าที่แถว `1` — ปริมาตรสินค้า `1.9` เกินขีดจำกัดแบบ soft (สูงสุด: `1.8`) | `{{"location": [1, "volume"], "type": "bus_soft_constraint_volume", "input": 1.9, "input_type": "float", "context": {"limits": 1.8, "profile": [0]}}}` |
| `bus_soft_constraint_distance` | Warning: Customer at row `6` — route distance `280.0` exceeds soft distance limit (max: `250.0`) | คำเตือน: ลูกค้าที่แถว `6` — ระยะทาง `280.0` เกินขีดจำกัดแบบ soft (สูงสุด: `250.0`) | `{{"location": [6, "distance"], "type": "bus_soft_constraint_distance", "input": 280.0, "input_type": "float", "context": {"limits": 250.0, "profile": [1]}}}` |
| `bus_soft_constraint_duration` | Warning: Customer at row `8` — route duration `460.0` exceeds soft duration limit (max: `420.0`) | คำเตือน: ลูกค้าที่แถว `8` — เวลาเดินทาง `460.0` เกินขีดจำกัดแบบ soft (สูงสุด: `420.0`) | `{{"location": [8, "duration"], "type": "bus_soft_constraint_duration", "input": 460.0, "input_type": "float", "context": {"limits": 420.0, "profile": [0]}}}` |
| `bus_missing_vehicle_groups` | Customer at row `9` — required vehicle group `TRUCK_6W` does not exist in the current vehicle configuration | ลูกค้าที่แถว `9` — กลุ่มยานพาหนะ `TRUCK_6W` ที่ต้องการไม่มีในระบบการกำหนดค่าปัจจุบัน | `{{"location": [9, "allow_vehicle_groups"], "type": "bus_missing_vehicle_groups", "input": "TRUCK_6W", "input_type": "string", "context": {"allow_vehicle_groups": ["TRUCK_6W"]}}}` |

---

## Notes

- **Hard constraints** (`bus_hard_constraint_*`) block the order — the customer cannot be served by any vehicle.
- **Soft constraints** (`bus_soft_constraint_*`) are warnings only — the order is still routable but may affect efficiency.
- **`location[0]` = `null`** for Pandera errors means the dtype of the entire column is wrong; fix the column data type first before row-level errors can be resolved.
- The `context.limitValue` field in Pandera/Pydantic errors and `context.limits` in constraint errors both carry the threshold value for display.