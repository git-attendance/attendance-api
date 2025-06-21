# SMS Notification Setup Guide

This guide will help you set up SMS notifications for guardian alerts when students attend school.

## Prerequisites

1. A Twilio account with SMS capabilities
2. A Twilio phone number
3. Sufficient account balance for SMS sending

## Setup Steps

### 1. Get Your Twilio Credentials

Visit your [Twilio Console](https://console.twilio.com/) and copy the following:

- **Account SID**: Found on your dashboard
- **Auth Token**: Found on your dashboard (keep this secret!)
- **Phone Number**: Purchase a phone number from Twilio if you haven't already

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

**Example:**

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

### 3. Phone Number Format

The system expects phone numbers in international format:

- **Correct**: `+639123456789` (Philippines)
- **Correct**: `+15551234567` (US)
- **Incorrect**: `09123456789` (will be auto-converted for Philippines numbers)

### 4. Testing SMS Functionality

Use the test endpoint to verify your configuration:

**Endpoint:** `POST /attendance/test-sms`

**Headers:**

```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Body:**

```json
{
  "phoneNumber": "+639123456789"
}
```

### 5. How It Works

When a student checks in or out:

1. Face recognition identifies the student
2. Attendance is recorded in the database
3. SMS notification is sent to the guardian's phone number
4. Message includes:
   - Student name
   - Subject name
   - Check-in/check-out status
   - Timestamp

### 6. Message Format

**Check-in Example:**

```
Hello Juan,

Your child Maria Santos has checked in to Mathematics at Dec 15, 2024, 8:30 AM.

- School Attendance System
```

**Check-out Example:**

```
Hello Juan,

Your child Maria Santos has checked out from Mathematics at Dec 15, 2024, 9:30 AM.

- School Attendance System
```

### 7. Error Handling

- If SMS fails, attendance processing continues normally
- Errors are logged but don't affect the attendance record
- Missing phone numbers are logged as warnings

### 8. Guardian Phone Number Requirements

Ensure student records have guardian phone numbers in the database:

```javascript
// Student model guardian structure
guardian: {
  firstName: "Juan",
  lastName: "Santos",
  email: "juan@email.com",
  phoneNumber: "+639123456789" // Required for SMS
}
```

### 9. Troubleshooting

**Common Issues:**

1. **SMS not sending**: Check Twilio credentials and account balance
2. **Phone number format**: Ensure international format (+country_code)
3. **Permission errors**: Only admins can use test SMS endpoint
4. **Missing guardian data**: Check if student has guardian phone number

**Logs to check:**

- SMS service logs for detailed error messages
- Console warnings for missing phone numbers
- Twilio webhook logs (if configured)

### 10. Cost Considerations

- SMS costs vary by destination country
- Check Twilio pricing for your target regions
- Consider setting up usage alerts in Twilio console

## Security Notes

- Keep your Twilio Auth Token secure
- Don't commit credentials to version control
- Use environment variables for all sensitive data
- Consider IP whitelisting in Twilio console for added security
