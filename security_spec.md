# Firestore Security Specification

This specification outlines the data invariants, secure schemas, and threat-vector analysis to preserve data integrity and student-teacher separation.

## 1. Core Data Invariants

1. **Teacher Authority**: Only the instructor (identified by administrative uid/email `zerihunfakana@gmail.com`) can create assignments, set grades, upload master materials, create surveys, or edit attendance registries.
2. **Student Identity Isolation**: Students can only register, update, or read their own specific profile, survey responses, submissions, reflection papers, and personal messaging threads.
3. **Relational Consistency**: A student submission must reference an existing assignment, and a survey response must reference an existing survey.
4. **Data Size Sanitization**: Text variables must be short (e.g., student name <= 100 characters; reflection journal <= 5000 chars) to prevent resource exhaustion.
5. **No Self-Assigned Grades**: Only the instructor can update `grade` or `comments` on assignment submissions. Students are forbidden from assigning their own marks.

---

## 2. The "Dirty Dozen" Threat Payloads

The following 12 malicious payloads represent vectors designed to bypass security checks. The firestore security rules must block them all (`PERMISSION_DENIED`).

### Payload 1: Student creates/alters global Course Materials
* **Path**: `/materials/malicious_doc`
* **Actor**: Student Auth ID (`student_123`)
* **Vector**: Writes a dummy material bypassing administrative validation.

### Payload 2: Student updates their own Assignment Grade
* **Path**: `/submissions/submission_abc`
* **Actor**: Student Auth ID (`student_123`)
* **Payload**: `{ "grade": 100, "comments": "Excellent job!", "studentId": "student_123" }`
* **Vector**: Self-assigning a perfect grade.

### Payload 3: Student overwrites another Student's Research Profile
* **Path**: `/research_profiles/student_other`
* **Actor**: Student Auth ID (`student_123`)
* **Payload**: `{ "studentId": "student_other", "topic": "Hijacking details", "updatedAt": "2026-06-01T08:00:00Z" }`
* **Vector**: Cross-tenant ID poisoning.

### Payload 4: Student edits previous class Attendance Records
* **Path**: `/attendance/2026-05-15`
* **Actor**: Student Auth ID (`student_123`)
* **Payload**: Modifies daily map to flag themselves as Present instead of Absent.
* **Vector**: Bypassing presence registry.

### Payload 5: Unauthenticated User registers a Profile
* **Path**: `/students/new_student`
* **Actor**: Unauthenticated (`null`)
* **Vector**: Injecting fake user records into the student collection.

### Payload 6: Student launches Broadcast Survey to the entire section
* **Path**: `/surveys/survey_hack`
* **Actor**: Student (`student_123`)
* **Vector**: Creating system-wide surveys without permission.

### Payload 7: Student reads another student's Reflection Journal
* **Path**: `/reflections/reflection_student_456`
* **Actor**: Student ID (`student_123`)
* **Vector**: Accessing confidential student thoughts.

### Payload 8: Deny of Wallet String Bloating Attack
* **Path**: `/students/student_123`
* **Payload**: Name field containing a 5MB payload of repeating characters.
* **Vector**: Resource consumption attack.

### Payload 9: Hijacking the Creator identity of a message
* **Path**: `/messages/msg_999`
* **Actor**: Student ID (`student_123`)
* **Payload**: `{ "senderId": "zerihunfakana@gmail.com", "senderRole": "instructor", "content": "Class cancelled!" }`
* **Vector**: Sending emails/messages claiming to be the course coordinator.

### Payload 10: State shortcut bypass of Submissions
* **Path**: `/submissions/submission_777`
* **Actor**: Student ID (`student_123`)
* **Payload**: Submitting homework missing required attachment variables.
* **Vector**: Schema compliance validation failure.

### Payload 11: Bulk querying all student records
* **Path**: `/students` (List query)
* **Actor**: Student (`student_123`)
* **Vector**: Admin page list scrap. Student must be prevented from grabbing other student emails/contacts.

### Payload 12: Admin role spoofing via token claims
* **Actor**: Student auth token with manual client custom-claim assertions.
* **Vector**: Insecure rules relying on `request.auth.token.role == "admin"`. Checked only on strict DB records or explicit instructor email verification.

---

## 3. Security Rule Verification Test Spec

Below is the design spec for our robust secure tests asserting access limits:

```typescript
// firestore.rules.test.ts Simulation Shape
describe("Course Companion Security Boundary Tests", () => {
  it("blocks student write on course materials", async () => {
    // Assert write returns PERMISSION_DENIED for student auth context
  });
  it("blocks student self-grading", async () => {
    // Assert update limits field changes to non-grade columns for student
  });
  it("blocks stranger register profiles", async () => {
    // Assert write returns PERMISSION_DENIED without auth context
  });
  it("allows Student to only read their own reflection", async () => {
    // Assert read success only if auth.uid == resource.studentId
  });
});
```
