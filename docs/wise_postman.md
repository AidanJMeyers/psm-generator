
Public
ENVIRONMENT
No Environment
LAYOUT
Double Column
LANGUAGE
cURL - cURL
Wise APIs
Introduction
Get Account Information
GET
Get account user
PUT
Update account profile
Manage Institutes
GET
Get All Institutes
PUT
Update Institute
Creating Users
POST
Create user
GET
Get User using Email/Phone
POST
Bulk add learners to a course
POST
Remove user from institute
POST
Add new identity for a student
POST
Remove identity for a student
Courses In your Institute
POST
Add a course
POST
Add a 1:1 course
GET
Get a course
GET
Get all courses
PUT
Edit a course
POST
Assign course to student
POST
Remove a student from a course
POST
Assign course to teacher
POST
Remove a teacher from a course
POST
Add student using Email/Phone in a course
POST
Archive Course
DEL
Delete a course (Deprecated - Use Archive Course API)
Teachers In your Institute
POST
Create a teacher
POST
Add Teacher using Email/Phone
GET
Get all teachers
POST
Update working hours of a teacher
GET
Get availability of a teacher
PUT
Add tags to a teacher
Students In your Institute
POST
Create a student
PUT
Add tags to a student
GET
Get all students
GET
Get all students in a Course
GET
Get single student data
POST
Suspend student in a course
POST
UnSuspend student in a course
PUT
Update Student Registration Fields
PUT
Update Student Admin Note
GET
Get Student Registration Data
GET
Get all Parents
GET
Search Students and/or Parents (use SearchTerm param in Query)
POST
Add New Parent to existing Student
POST
Add existing Parent to existing Student Copy
Admins In your Institute
POST
Make a user an admin
POST
Remove user as admin
Manage Live Sessions
Get Sessions Data
GET
Get all sessions in a course by date
GET
Get past sessions in a course
GET
Get future sessions in a course
GET
Get single session details
GET
Get raw attendance in a course
GET
Get all past sessions in institute
GET
Get all future sessions in institute
GET
Get lens insights for a course
Go Live APIs
POST
Start a Live Session
POST
Start a session using your UUID
POST
Start a Zoom Registered Session
POST
Start a Lens Session (using External User ID)
POST
Start a Lens Session (using Internal User ID)
POST
Start Lens with your Zoom links
POST
Schedule a live session
PUT
Update a scheduled session
POST
Check session conflicts
GET
Join Session with Registration
DEL
Delete a session
POST
Add Feedback for Completed Session
POST
End a Running Session
DEL
Cancel a Session
Managing Webinars
POST
Add a lead
Manage Course Content
GET
Get Course Content
PUT
Import Template in Course Content
Tests in your course
Create Test in a Course
GET
Get Content & Sections
POST
Create a Test in Course Content
POST
Add Questions
PUT
Update Settings
PUT
Publish Test
GET
Get Test Submissions
Assessments in your course
POST
Get all assessments
GET
Get a single assessment
POST
Create Assessments in a Content Section
POST
Evaluate Student Assessment Submission
Resources in your course
GET
Get Content in Course
POST
Add a Section in Course Content
POST
Add Embedded Links in Content Section
Polls in your course
Discussions in your course
POST
Create a discussion
PUT
Update a discussion
POST
Get all discussions
GET
Get a single discussion
POST
Delete a discussion
Agendas for Lens
POST
Create a new Agenda with Multi Question Quiz
PUT
Assign Agenda To Room/Course
PUT
Update an Agenda
DEL
Delete and Agenda
Lens Sessions
POST
Start a Lens Session
PUT
Update Settings of a Lens Room
GET
Get Settings of a Lens Room
POST
Start Lens with your Zoom links
GET
Get a single live session attendance/insights
Manage Fees
GET
Get Fees for a course
GET
Get Institute Transactions
POST
Add or Update Course Fees - Add Instalments by days
POST
Add or Update Course Fees - Add Instalments by date
DEL
Delete Course Fees
GET
Get All Student Fees Summary
GET
Get Single Student Fees
POST
Add or Update Student Fees
POST
Add offline transaction for student
POST
Add Single Invoice for Student
Chats
POST
Admin Only Chat with Student
POST
Course Chat with Student (Teacher added as Chat Participant)
GET
Get All Chats
GET
Get Chat by Chat ID
POST
Send a Message
Consultations
POST
Book a Consultation for a Student
GET
Get all upcoming consultation sessions
GET
Get all past consultation sessions
GET
Get single consultation session details
Manage Student Credits
GET
Get Student Credits (at course level)
POST
Adding Credits to Student
POST
Marking Credits as Consumed for Student
GET
Student Reports
GET
Student Registration Data
Wise APIs
Wise is capable of allowing you to run your online tutoring business seamlessly using state-of-the-art infrastructure that I able to handle more than 25,000 Live Sessions each day and more than 900 being run simultaneously.

We have been using this infrastructure to support 150,000 tutors teaching more than 2,500,000 learners over the past year. Wise provides an Android, iOS and Web application for your learners and tutors to start live classes and make the most of the fully functional LMS modules developed to make online tutoring fun and engaging.

Getting Started
To get access to the APIs, please follow the steps below

Sign-up on Wise.Live website

Create your institute and choose your sub-domain name

Go to Settings >> Developer and enable APIs

Your API Credentials
Wise REST APIs uses the Basic Auth to authorise and authenticate calls.

The following properties are required while making API calls

host: All APIs should be sent to api.wiseapp.live

user_id: The account owner's user UUID

api_key: API key for authentication and used in x-api-key in the API Headers

institute_id: A UUID generated for your institute

namespace: Your sub-domain that you choose while creating your institute. For subdomain, xyz.wise.live the namespace is xyz

user-agent: This is required in the headers for each API call. The user-agent should be be VendorIntegrations/{{namespace}}

Rate limits
We have per API key rate limits of 500 API calls per minute. Please reach out to us on info@wiseapp.live if you need this to be increased.

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

GET
Get account user
{{host}}/user/getUser
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Example Request
Get account user
curl
curl --location -g '{{host}}/user/getUser' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "name": "Gautam",
    "namespace": "wise",
    "profile": "teacher",
    "profilePicture": "https://files.wiseapp.live/upload_files/XXXXXXXXXXXXXXXX/upload_XXXXXXXXXXXXXXXX.png",
    "_id": "XXXXXXXXXXXXXXXX",
    "phoneNumber": "+9197427XXXXX",
    "createdAt": "2020-10-23T20:17:44.163Z",
    "referralCode": "KZX96L",
    "referralLink": "https://links.wiseapp.live/XXXX",
    "uuid": "XXXXXXXXXXXXXXXX",
    "email": "XXXXX@gmail.com",
    "isTrialPeriod": false,
    "premiumExpiry": "2025-04-02T00:00:00.000Z",
    "currentPremiumCount": 5,
    "premiumPlan": "ESSENTIAL"
  }
}
GET
Get User using Email/Phone
{{host}}/vendors/userByIdentifier?provider=EMAIL&identifier=user@wise.live
In provider pass EMAIL or PHONE_NUMBER or VENDOR_USER_ID

and pass the corresponding identity in the identifier field

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
provider
EMAIL

identifier
user@wise.live

Example Request
Get User using Email
View More
curl
curl --location -g '{{host}}/vendors/userByIdentifier?provider=EMAIL&identifier=samba%40wise.live' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "user": {
      "_id": "68c99b36ea9d48d3909e7d85",
      "identities": [
        {
          "identifier": "hXYKOaAQOSWb2kmbdldR52unwDw1",
          "provider": "FIREBASE_ID",
          "providerMetadata": {
            "email": "user@wise.live"
          }
        },
        {
          "identifier": "+919988776677",
          "provider": "PHONE_NUMBER"
        }
      ],
      "email": "samba@wise.live",
      "name": "Sam",
      "phoneNumber": "+919988776677",
      "profilePicture": ""
    }
  }
}
POST
Bulk add learners to a course
{{host}}/institutes/{{institute_id}}/sendBulkInvite
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "type":"STUDENT",
    "identifiers":["+912900000001"], 
    "classId": "{{class_id}}", 
    "createNew": true
}
Example Request
Bulk add learners to a course
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/sendBulkInvite' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "type":"STUDENT",
    "identifiers":["+912900000001"], 
    "classId": "{{class_id}}", 
    "createNew": true
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Invitation sent successfully"
}
POST
Remove user from institute
{{host}}/institutes/{{institute_id}}/removeParticipant
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "userId": "{{student_id}}"
}
Example Request
Remove user from institute
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/removeParticipant' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "userId": "{{student_id}}"
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "User removed from institute successfully"
}
POST
Add new identity for a student
{{host}}/institutes/{{institute_id}}/participants/{{student_id}}/addNewIdentity
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "email": "",
    "phoneNumber": ""
}
Example Request
Add new email for a user
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/participants/{{student_id}}/addNewIdentity' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data-raw '{
    "email": "student00110011@wise.live"
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Email account linked successfully!"
}
GET
Get a course
{{host}}/user/v2/classes/{{class_id}}?full=true
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
full
true

Example Request
Get a course
curl
curl --location -g '{{host}}/user/v2/classes/{{class_id}}?full=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "namespace": "test911",
    "zoomLink": {
      "join_url": "",
      "mettingEnded": false,
      "startTime": "2024-06-24T09:38:05.242Z"
    },
    "pendingRequest": [],
    "joinedRequest": [
      "66793e91fa9c2a6a2e1d2b4d",
      "66794a48fa9c2a8dba1dde46",
      "667bc01c58c6260fc5e269da"
    ],
    "coTeacherRequests": [],
    "coTeachers": [],
    "hidden": false,
    "archived": false,
    "disableReminder": false,
    "settings": {
      "disableStudentDiscussions": false,
      "disableStudentComments": false,
      "lockClassroom": false,
      "lockAfter": 0,
      "openClassroom": false,
      "admissionsDisabled": false,
      "autoAccept": false,
      "validityInDays": -1,
      "provideCertification": false,
      "videoPlayRestriction": -1
    },
    "classType": "LIVE",
    "newContentStructure": true,
    "_id": "66793e7d47c290929e8779e5",
    "subject": "Sample Subject",
    "userId": {
      "name": "Yugendra Dhariwal",
      "profilePicture": "",
      "_id": "66793e38fa9c2a30cf1d2595",
      "createdAt": "2024-06-24T09:36:56.742Z",
      "phoneNumber": "+912900001111"
    },
    "name": "Sample Course",
    "classNumber": 178925298,
    "schedule": {
      "occurrences": []
    },
    "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
    "instituteId": "66793e38fa9c2a40d81d259a",
    "published": true,
    "classCovers": [
      {
        "type": "image",
        "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
      }
    ],
    "deletedStudents": [],
    "suspendedStudents": [],
    "createdAt": "2024-06-24T09:38:05.244Z",
    "updatedAt": "2024-06-26T07:15:40.535Z",
    "__v": 0,
    "joinMagicLink": "",
    "isCoTeacher": false,
    "isSuspendedStudent": false,
    "isSubscriptionRequired": false,
    "isAdmin": true,
    "timing": [],
    "timingVersion": 2
  }
}
GET
Get all courses
{{host}}/institutes/{{institute_id}}/classes?classType=LIVE&showCoTeachers=true&searchTerm=searchTerm
classType can be

LIVE to get live courses

RECORDED to get recorded courses

ONE_TO_ONE to get one to one courses

Use searchTerm to search for courses using a string

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
classType
LIVE

showCoTeachers
true

searchTerm
searchTerm

Example Request
Get all courses
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/classes?classType=LIVE&showCoTeachers=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "classes": [
      {
        "_id": "66793e7d47c290929e8779e5",
        "pendingRequest": [],
        "joinedRequest": [
          "66793e91fa9c2a6a2e1d2b4d",
          "66794a48fa9c2a8dba1dde46",
          "667bc01c58c6260fc5e269da",
          "667bbfae567ebeb8fbcbbf4f",
          "667bc4a5567ebeb8fbcd25d8",
          "667bcec8fc2639a7bf19bfd0"
        ],
        "coTeachers": [
          {
            "_id": "667bc35a127bd4f9b7590814",
            "name": "Shyam Sharma",
            "profilePicture": ""
          }
        ],
        "settings": {
          "disableStudentDiscussions": false,
          "disableStudentComments": false,
          "lockClassroom": false,
          "lockAfter": 0,
          "openClassroom": false,
          "admissionsDisabled": false,
          "autoAccept": true,
          "validityInDays": -1,
          "provideCertification": false,
          "videoPlayRestriction": -1,
          "magicJoinTokenConfig": {
            "enabledOn": "2024-06-26T07:26:16.760Z",
            "loginRequired": false,
            "registrationRequired": true,
            "token": "66793e7d47c290929e8779e542239643"
          }
        },
        "classType": "LIVE",
        "subject": "Sample Subject",
        "name": "Sample Course",
        "classNumber": 178925298,
        "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
        "published": true,
        "classCovers": [
          {
            "type": "image",
            "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
          }
        ],
        "createdAt": "2024-06-24T09:38:05.244Z",
        "fees": {
          "_id": "667bd148567ebeb8fbd12d34",
          "classId": "66793e7d47c290929e8779e5",
          "__v": 0,
          "createdAt": "2024-06-26T08:28:56.949Z",
          "currency": "INR",
          "paymentOptions": [
            {
              "_id": "667bd1480c9ac4506aadaf65",
              "type": "INSTALLMENT",
              "installments": [
                {
                  "_id": "667bd1480c9ac4c437adaf66",
                  "dueAfterDays": 0,
                  "amount": {
                    "value": 100000,
                    "currency": "INR"
                  },
                  "index": 1
                },
                {
                  "_id": "667bd1480c9ac40999adaf67",
                  "dueAfterDays": 30,
                  "amount": {
                    "value": 100000,
                    "currency": "INR"
                  },
                  "index": 2
                },
                {
                  "_id": "667bd1480c9ac422d1adaf68",
                  "dueAfterDays": 60,
                  "amount": {
                    "value": 100000,
                    "currency": "INR"
                  },
                  "index": 3
                }
              ],
              "totalAmount": {
                "value": 300000,
                "currency": "INR"
              },
              "updatedAt": "2024-06-26T08:28:56.949Z",
              "createdAt": "2024-06-26T08:28:56.949Z"
            }
          ],
          "updatedAt": "2024-06-26T08:28:56.949Z"
        },
        "feesAdded": true,
        "defaultCoverBackground": "https://cdn.wiseapp.live/marketing_template_resources/course/course_cover.png",
        "feesType": [
          "INSTALLMENT"
        ]
      },
      {
        "_id": "667949ee1da80086704bef6b",
        "pendingRequest": [],
        "joinedRequest": [],
        "coTeachers": [],
        "settings": {
          "disableStudentDiscussions": false,
          "disableStudentComments": false,
          "lockClassroom": false,
          "lockAfter": 0,
          "openClassroom": false,
          "admissionsDisabled": false,
          "autoAccept": true,
          "validityInDays": -1,
          "provideCertification": false,
          "videoPlayRestriction": -1
        },
        "classType": "LIVE",
        "subject": "Fees",
        "name": "Fees in 1 day",
        "classNumber": 446205423,
        "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-43.png",
        "published": true,
        "classCovers": [
          {
            "type": "image",
            "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-5.png"
          }
        ],
        "createdAt": "2024-06-24T10:26:54.996Z",
        "fees": {
          "_id": "66794a14567ebeb8fb27bc19",
          "classId": "667949ee1da80086704bef6b",
          "__v": 0,
          "createdAt": "2024-06-24T10:27:32.484Z",
          "currency": "INR",
          "paymentOptions": [
            {
              "_id": "66794a1410767a29865cc404",
              "type": "INSTALLMENT",
              "installments": [
                {
                  "_id": "66794a1410767a73bf5cc405",
                  "dueAfterDays": 1,
                  "amount": {
                    "value": 1000,
                    "currency": "INR"
                  },
                  "index": 1
                },
                {
                  "_id": "66794a1410767ac3005cc406",
                  "dueAfterDays": 31,
                  "amount": {
                    "value": 1000,
                    "currency": "INR"
                  },
                  "index": 2
                }
              ],
              "totalAmount": {
                "value": 2000,
                "currency": "INR"
              },
              "updatedAt": "2024-06-24T10:27:32.484Z",
              "createdAt": "2024-06-24T10:27:32.484Z"
            }
          ],
          "updatedAt": "2024-06-24T10:27:32.484Z"
        },
        "feesAdded": true,
        "defaultCoverBackground": "https://cdn.wiseapp.live/marketing_template_resources/course/course_cover.png",
        "feesType": [
          "INSTALLMENT"
        ]
      }
    ],
    "hiddenClasses": [],
    "pendingClasses": []
  }
}
POST
Add student using Email/Phone in a course
{{host}}/institutes/{{institute_id}}/sendBulkInvite
In the Identity field, you can use either email or phone number.

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "type": "STUDENT",
    "users": [
        {
            "name": "Utkarsh",
            "identifier": "+912900002910"
        }
    ],
    "classId": "6698d2ad2b9ddf49a67cb80e",
    "createNew": true,
    "jsonData": true,
    "addToInstitute": true
}
Example Request
Add student using Email/Phone in a course
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/sendBulkInvite' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "type": "STUDENT",
    "users": [
        {
            "name": "Utkarsh",
            "identifier": "+912900002910"
        }
    ],
    "classId": "6698d2ad2b9ddf49a67cb80e",
    "createNew": true,
    "jsonData": true,
    "addToInstitute": true
}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "usersCount": 1,
    "background": false,
    "message": "Invitation sent successfully",
    "user": {
      "_id": "66c63a490e79f57c074092ed"
    }
  }
}
POST
Archive Course
{{host}}/teacher/classes/{{class_id}}/hiddenStatus
AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "hidden": true
}
Example Request
Archive Course
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/hiddenStatus' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "hidden": true
}'
200 OK
Example Response
Body
Headers (12)
{
  "status": 200,
  "message": "Success",
  "data": "Course archived successfully"
}
POST
Add Teacher using Email/Phone
{{host}}/institutes/{{institute_id}}/sendBulkInvite
Invite teachers (via email or phone number) for a given institute

This endpoint creates teacher user accounts (if needed) and sends invitations so they can join the institute on Wise.

Request Body Fields

type (string, required): Must be "TEACHER" for this endpoint usage.

jsonData (boolean, required): Indicates that user data is being sent as JSON.

users (array, required): List of teachers to invite.

Each item has:

name (string, required) – Teacher’s display name.

isAdmin (boolean, required) – Whether the teacher should have institute admin privileges.

email (string, optional) – Teacher’s email address

phoneNumber (string, optional) – Teacher’s phone number

At least one of email or phoneNumber should be provided for each user so that the invitation can be delivered.

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "type": "TEACHER",
    "jsonData": true,
    "users": [
        {
            "name": "Teacher Name",
            "isAdmin": false,
            "email": "teacher_email@mail.com"
        }
    ]
}
Example Request
Add Teacher using Email/Phone
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/sendBulkInvite' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "type": "TEACHER",
    "jsonData": true,
    "users": [
        {
            "name": "Teacher Name",
            "isAdmin": false,
            "email": "teacher_email@mail.com"
        }
    ]
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get all teachers
{{host}}/institutes/{{institute_id}}/teachers
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Example Request
Get all teachers
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/teachers' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data ''
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "teachers": [
      {
        "_id": "667bc3cb567ebeb8fbccf2c1",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "userId": {
          "_id": "667bc3cb567ebeb8fbccf2ba",
          "name": "teacher001",
          "profilePicture": "https://cdn.wiseapp.live/images/institute_thumbnail/4.png",
          "email": "teacher001@wise.live",
          "phoneNumber": "+912900111111"
        },
        "joinedOn": "2024-06-26T07:32:13.848Z",
        "relation": "TEACHER",
        "status": "ACCEPTED",
        "updatedAt": "2024-06-26T07:32:13.849Z",
        "classes": []
      },
      {
        "_id": "667bc35a567ebeb8fbccd068",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "relation": "TEACHER",
        "userId": {
          "_id": "667bc35a127bd4f9b7590814",
          "name": "Shyam Sharma",
          "profilePicture": "",
          "email": "ss@wise.live",
          "activated": false
        },
        "joinedOn": "2024-06-26T07:29:30.214Z",
        "status": "ACCEPTED",
        "updatedAt": "2024-06-26T07:29:30.214Z",
        "classes": []
      }
    ]
  }
}
POST
Update working hours of a teacher
{{host}}/institutes/{{institute_id}}/teachers/{{teacher_id}}/workingHours
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "timeZone": "America/Los_Angeles",
    "slots": [
        {
            "day": "Monday",
            "startTime": "09:00",
            "endTime": "14:00"
        },
        {
            "day": "Monday",
            "startTime": "15:00",
            "endTime": "17:00"
        },
        {
            "day": "Monday",
            "startTime": "18:00",
            "endTime": "20:00"
        },
        {
            "day": "Tuesday",
            "startTime": "09:00",
            "endTime": "17:00"
        },
        {
            "day": "Wednesday",
            "startTime": "09:00",
            "endTime": "17:00"
        },
        {
            "day": "Friday",
            "startTime": "09:00",
            "endTime": "17:00"
        }
    ]
}
Example Request
Update working hours of a teacher
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/teachers/{{teacher_id}}/workingHours' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "timeZone": "America/Los_Angeles",
    "slots": [
        {
            "day": "Monday",
            "startTime": "09:00",
            "endTime": "14:00"
        },
        {
            "day": "Monday",
            "startTime": "15:00",
            "endTime": "17:00"
        },
        {
            "day": "Monday",
            "startTime": "18:00",
            "endTime": "20:00"
        },
        {
            "day": "Tuesday",
            "startTime": "09:00",
            "endTime": "17:00"
        },
        {
            "day": "Wednesday",
            "startTime": "09:00",
            "endTime": "17:00"
        },
        {
            "day": "Friday",
            "startTime": "09:00",
            "endTime": "17:00"
        }
    ]
}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "teacherWorkingHours": {
      "_id": "667bc431567ebeb8fbcd0956",
      "instituteId": "66793e38fa9c2a40d81d259a",
      "userId": "667bc35a127bd4f9b7590814",
      "__v": 0,
      "createdAt": "2024-06-26T07:33:05.438Z",
      "slots": [
        {
          "day": "Monday",
          "startTime": "09:00",
          "endTime": "14:00"
        },
        {
          "day": "Monday",
          "startTime": "15:00",
          "endTime": "17:00"
        },
        {
          "day": "Monday",
          "startTime": "18:00",
          "endTime": "20:00"
        },
        {
          "day": "Tuesday",
          "startTime": "09:00",
          "endTime": "17:00"
        },
        {
          "day": "Wednesday",
          "startTime": "09:00",
          "endTime": "17:00"
        },
        {
          "day": "Friday",
          "startTime": "09:00",
          "endTime": "17:00"
        }
      ],
      "timezone": "America/Los_Angeles",
      "updatedAt": "2024-06-26T07:33:05.438Z"
    }
  }
}
GET
Get availability of a teacher
{{host}}/institutes/{{institute_id}}/teachers/{{teacher_id}}/availability?startTime=2024-06-27T18:30:00.000Z&endTime=2024-07-01T18:29:59.999Z
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

PARAMS
startTime
2024-06-27T18:30:00.000Z

endTime
2024-07-01T18:29:59.999Z

Example Request
Get availability of a teacher
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/teachers/{{teacher_id}}/availability?startTime=2024-06-27T18%3A30%3A00.000Z&endTime=2024-07-01T18%3A29%3A59.999Z' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data ''
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "sessions": [],
    "workingHours": {
      "_id": "667bc431567ebeb8fbcd0956",
      "instituteId": "66793e38fa9c2a40d81d259a",
      "userId": "667bc35a127bd4f9b7590814",
      "__v": 0,
      "createdAt": "2024-06-26T07:33:05.438Z",
      "slots": [
        {
          "day": "Monday",
          "startTime": "09:00",
          "endTime": "14:00"
        },
        {
          "day": "Monday",
          "startTime": "15:00",
          "endTime": "17:00"
        },
        {
          "day": "Monday",
          "startTime": "18:00",
          "endTime": "20:00"
        },
        {
          "day": "Tuesday",
          "startTime": "09:00",
          "endTime": "17:00"
        },
        {
          "day": "Wednesday",
          "startTime": "09:00",
          "endTime": "17:00"
        },
        {
          "day": "Friday",
          "startTime": "09:00",
          "endTime": "17:00"
        }
      ],
      "timezone": "America/Los_Angeles",
      "updatedAt": "2024-06-26T07:33:05.438Z"
    },
    "leaves": [],
    "teacherAvailabilitySettings": {
      "enabled": true,
      "disableUpdatingLeaves": false,
      "disableUpdatingWorkingHours": false
    }
  }
}
GET
Get all students
{{host}}/institutes/v3/{{institute_id}}s/students?status=ACCEPTED&page_size=50&page_number=1&showParents=true&showFeedbackData=true
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
status
ACCEPTED

page_size
50

page_number
1

showParents
true

showFeedbackData
true

Example Request
Get all learners
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/students?status=ACCEPTED' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "students": [
      {
        "_id": "667bc01c567ebeb8fbcbe167",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "relation": "STUDENT",
        "userId": {
          "_id": "667bc01c58c6260fc5e269da",
          "name": "",
          "profilePicture": "",
          "uuid": "ed4060e8-d49c-41ad-8356-00e668d780d7",
          "activated": false,
          "phoneNumber": "+912900000001"
        },
        "joinedOn": "2024-06-26T07:15:40.522Z",
        "status": "ACCEPTED",
        "classes": [
          {
            "_id": "66793e7d47c290929e8779e5",
            "hidden": false,
            "subject": "Sample Subject",
            "name": "Sample Course",
            "isSuspended": false
          }
        ]
      },
      {
        "_id": "66794a48567ebeb8fb27cdfa",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "relation": "STUDENT",
        "userId": {
          "_id": "66794a48fa9c2a8dba1dde46",
          "name": "Dhruv Sharma",
          "profilePicture": "",
          "uuid": "82476016-c8c1-4f94-a1cd-5ef804cd7734",
          "activated": true,
          "phoneNumber": "+912900008899"
        },
        "joinedOn": "2024-06-24T10:28:24.904Z",
        "status": "ACCEPTED",
        "classes": [
          {
            "_id": "66793e7d47c290929e8779e5",
            "hidden": false,
            "subject": "Sample Subject",
            "name": "Sample Course",
            "isSuspended": false
          }
        ]
      },
      {
        "_id": "66793e91567ebeb8fb24be2d",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "relation": "STUDENT",
        "userId": {
          "_id": "66793e91fa9c2a6a2e1d2b4d",
          "name": "Shyam Sundar",
          "profilePicture": "",
          "uuid": "24f899eb-9e83-4c24-b6f3-99dc32f5a31d",
          "activated": false,
          "phoneNumber": "+919742700890"
        },
        "joinedOn": "2024-06-24T09:38:25.250Z",
        "status": "ACCEPTED",
        "classes": [
          {
            "_id": "66793e7d47c290929e8779e5",
            "hidden": false,
            "subject": "Sample Subject",
            "name": "Sample Course",
            "isSuspended": false
          }
        ]
      },
      {
        "_id": "667bbfae567ebeb8fbcbbf58",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "userId": {
          "_id": "667bbfae567ebeb8fbcbbf4f",
          "name": "student001",
          "profilePicture": "https://cdn.wiseapp.live/images/institute_thumbnail/4.png",
          "email": "student001@gmail.com",
          "uuid": "7fcafc64-c4a3-43da-9c06-fcfa2b879aa2",
          "phoneNumber": "+919911991199"
        },
        "joinedOn": "2024-06-26T07:18:07.768Z",
        "relation": "STUDENT",
        "status": "ACCEPTED",
        "classes": []
      },
      {
        "_id": "667bc4a5567ebeb8fbcd25e1",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "userId": {
          "_id": "667bc4a5567ebeb8fbcd25d8",
          "name": "student001",
          "profilePicture": "https://cdn.wiseapp.live/images/institute_thumbnail/4.png",
          "email": "student001@wise.live",
          "uuid": "9d99a075-bf7d-416d-a29a-cc81708aab3f",
          "phoneNumber": "+912900111110"
        },
        "joinedOn": "2024-06-26T07:35:01.292Z",
        "relation": "STUDENT",
        "status": "ACCEPTED",
        "classes": []
      }
    ]
  }
}
GET
Get all students in a Course
{{host}}/user/classes/{{class_id}}/participants?showCoTeachers=true
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
showCoTeachers
true

Example Request
Get all students in a Course
View More
curl
curl --location -g '{{host}}/user/classes/{{class_id}}/participants?showCoTeachers=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
{
  "status": 200,
  "message": "Success",
  "data": {
    "_id": "6870e06fa78bde7aa89824f7",
    "userId": "66793e38fa9c2a30cf1d2595",
    "pendingRequest": [],
    "joinedRequest": [
      {
        "_id": "6870e3fb7c49d0a2e7998a5d",
        "name": "Akash",
        "phoneNumber": "+91988xxxxxxxxx",
        "profilePicture": "",
        "uuid": "f2628ae5-4f03-49d5-9485-c3d914ad429e"
      },
      {
        "_id": "6870e2da7c49d0a2e7990c99",
        "email": "akaxxxxxxxxx",
        "name": "Amit",
        "profilePicture": "",
        "uuid": "43f5d9bc-65b3-4417-9d66-3df1a6dcc7df"
      },
      {
        "_id": "6870e2e47c49d0a2e79910ca",
        "email": "syedxxxxxxxxxx",
        "name": "Syed",
        "profilePicture": "",
        "uuid": "a1937f9d-77df-4a2a-b36d-c588fe8d7dfa"
      },
      {
        "_id": "6870e1897c49d0a2e7985fcc",
        "name": "Sameera",
        "phoneNumber": "+91290xxxxxxxx",
        "profilePicture": "",
        "uuid": "948e7c26-dbfc-4adb-a9d7-9ea3ecf5d58f"
      }
    ],
    "coTeachers": [],
    "settings": {
      "disableStudentDiscussions": false,
      "disableStudentComments": false,
      "lockClassroom": false,
      "lockAfter": 0,
      "openClassroom": false,
      "admissionsDisabled": false,
      "autoAccept": true,
      "magicJoinTokenConfig": {
        "enabledOn": "2025-07-11T10:03:04.339Z",
        "token": "6870e06fa78bde7aa89824f773956433",
        "loginRequired": false,
        "registrationRequired": false
      },
      "validityInDays": -1,
      "provideCertification": false,
      "videoPlayRestriction": -1,
      "disableWebSdk": false,
      "disableScreenCapture": true
    },
    "instituteId": "66793e38fa9c2a40d81d259a",
    "suspendedStudents": [],
    "admins": [],
    "invitedStudents": [],
    "invitedCoTeachers": [],
    "invitedAdmins": [],
    "pendingAdmins": []
  }
}
POST
Suspend student in a course
{{host}}/teacher/classes/{{class_id}}/suspendStudent
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "studentId": "{{student_id}}"
}
Example Request
Suspend student in a course
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/suspendStudent' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "studentId": "{{student_id}}"
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Suspension successful"
}
POST
UnSuspend student in a course
{{host}}/teacher/classes/{{class_id}}/unSuspendStudent
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "studentId": "{{student_id}}",
    "type": "SUSPEND"
}
Example Request
UnSuspend student in a course
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/unSuspendStudent' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "studentId": "{{student_id}}",
    "type": "SUSPEND"
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Search Students and/or Parents (use SearchTerm param in Query)
{{host}}/institutes/v3/{{institute_id}}s/students?status=ACCEPTED&page_size=50&page_number=1&showParents=true&showFeedbackData=true&showContractStatus=true&searchTerm={{search_term}}
AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
status
ACCEPTED

page_size
50

page_number
1

showParents
true

showFeedbackData
true

showContractStatus
true

searchTerm
{{search_term}}

Example Request
Search Students and/or Parents (use SearchTerm param in Query)
View More
curl
curl --location -g '{{host}}/institutes/v3/{{institute_id}}s/students?status=ACCEPTED&page_size=50&page_number=1&showParents=true&showFeedbackData=true&showContractStatus=true&searchTerm={{search_term}}' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data ''
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Add New Parent to existing Student
{{host}}/institutes/{{institute_id}}/parents
AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "userId": "{{student_id}}",
    "parent": {
        "name": "Parent Name",
        "email": "parent_email@mail.com",
        "phoneNumber": "+919876543210"
    }
}
Example Request
Add New Parent to existing Student
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/parents' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "userId": "{{student_id}}",
    "parent": {
        "name": "Parent Name",
        "email": "parent_email@mail.com",
        "phoneNumber": "+919876543210"
    }
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
Admins In your Institute
AUTHORIZATION
Basic Auth
This folder is using Basic Auth from collectionWise APIs
POST
Make a user an admin
{{host}}/institutes/{{institute_id}}/makeAdmin
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "userId": "{{teacher_id}}"
}
Example Request
Make a user an admin
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/makeAdmin' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "userId": "{{teacher_id}}"
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "User successfully created as institute admin"
}
GET
Get future sessions in a course
{{host}}/institutes/{{institute_id}}/sessions?showUnsharedRecording=true&showFeedbackData=true&page_number=1&page_size=25&paginateBy=COUNT&status=FUTURE&classId={{class_id}}
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
showUnsharedRecording
true

showFeedbackData
true

page_number
1

page_size
25

paginateBy
COUNT

status
FUTURE

classId
{{class_id}}

Example Request
Get future sessions in a course
View More
curl
curl --location -g 'https://api.wiseapp.live/institutes/{{institute_id}}/sessions?showUnsharedRecording=true&showFeedbackData=true&page_number=1&page_size=25&paginateBy=COUNT&status=FUTURE&classId={{class_id}}' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "sessions": [
      {
        "_id": "667bc56ae2f73a7d972764d3",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-06-26T07:45:00.000Z",
        "scheduledEndTime": "2024-06-26T08:45:00.000Z",
        "start_time": "2024-06-26T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.189Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a08f22764d4",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-06-27T07:45:00.000Z",
        "scheduledEndTime": "2024-06-27T08:45:00.000Z",
        "start_time": "2024-06-27T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.189Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a47ee2764d5",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-06-28T07:45:00.000Z",
        "scheduledEndTime": "2024-06-28T08:45:00.000Z",
        "start_time": "2024-06-28T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a380d2764d6",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-01T07:45:00.000Z",
        "scheduledEndTime": "2024-07-01T08:45:00.000Z",
        "start_time": "2024-07-01T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a114f2764d7",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-02T07:45:00.000Z",
        "scheduledEndTime": "2024-07-02T08:45:00.000Z",
        "start_time": "2024-07-02T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a18c72764d8",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-03T07:45:00.000Z",
        "scheduledEndTime": "2024-07-03T08:45:00.000Z",
        "start_time": "2024-07-03T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73ac5b92764d9",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-04T07:45:00.000Z",
        "scheduledEndTime": "2024-07-04T08:45:00.000Z",
        "start_time": "2024-07-04T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73ad0a52764da",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-05T07:45:00.000Z",
        "scheduledEndTime": "2024-07-05T08:45:00.000Z",
        "start_time": "2024-07-05T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a013f2764db",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-08T07:45:00.000Z",
        "scheduledEndTime": "2024-07-08T08:45:00.000Z",
        "start_time": "2024-07-08T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73af10a2764dc",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-09T07:45:00.000Z",
        "scheduledEndTime": "2024-07-09T08:45:00.000Z",
        "start_time": "2024-07-09T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a24522764dd",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-10T07:45:00.000Z",
        "scheduledEndTime": "2024-07-10T08:45:00.000Z",
        "start_time": "2024-07-10T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a3bfe2764de",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-11T07:45:00.000Z",
        "scheduledEndTime": "2024-07-11T08:45:00.000Z",
        "start_time": "2024-07-11T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a07ce2764df",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-12T07:45:00.000Z",
        "scheduledEndTime": "2024-07-12T08:45:00.000Z",
        "start_time": "2024-07-12T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a3d092764e0",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-15T07:45:00.000Z",
        "scheduledEndTime": "2024-07-15T08:45:00.000Z",
        "start_time": "2024-07-15T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73abeb32764e1",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-16T07:45:00.000Z",
        "scheduledEndTime": "2024-07-16T08:45:00.000Z",
        "start_time": "2024-07-16T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a2b442764e2",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-17T07:45:00.000Z",
        "scheduledEndTime": "2024-07-17T08:45:00.000Z",
        "start_time": "2024-07-17T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a55542764e3",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-18T07:45:00.000Z",
        "scheduledEndTime": "2024-07-18T08:45:00.000Z",
        "start_time": "2024-07-18T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73a6f7f2764e4",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-19T07:45:00.000Z",
        "scheduledEndTime": "2024-07-19T08:45:00.000Z",
        "start_time": "2024-07-19T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.190Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73ab9ba2764e5",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-22T07:45:00.000Z",
        "scheduledEndTime": "2024-07-22T08:45:00.000Z",
        "start_time": "2024-07-22T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.191Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      },
      {
        "_id": "667bc56ae2f73abbe42764e6",
        "attendanceRecorded": false,
        "mettingEnded": false,
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "scheduledStartTime": "2024-07-23T07:45:00.000Z",
        "scheduledEndTime": "2024-07-23T08:45:00.000Z",
        "start_time": "2024-07-23T07:45:00.000Z",
        "end_time": null,
        "classId": {
          "_id": "66793e7d47c290929e8779e5",
          "name": "Sample Course",
          "subject": "Sample Subject",
          "thumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-9.png",
          "classCovers": [
            {
              "type": "image",
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
            }
          ],
          "classType": "LIVE"
        },
        "userId": {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profilePicture": ""
        },
        "title": "Live session",
        "metadata": {
          "ownerId": "66793e38fa9c2a30cf1d2595",
          "recurrenceId": "667bc56ae2f73ad9d82764d1"
        },
        "participants": [],
        "createdAt": "2024-06-26T07:38:18.191Z",
        "studentSubmissions": [],
        "studentsFeedback": {
          "rating": 0,
          "count": 0
        },
        "recordings": []
      }
    ],
    "page_number": 1,
    "totalRecords": 20,
    "page_count": 1
  }
}
GET
Get single session details
{{host}}/user/class/{{class_id}}sessions/{{session_id}}?showLiveClassInsight=true&showFeedbackConfig=true&showFeedbackSubmission=true&showSessionFiles=true&showAgendaStructure=true
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
showLiveClassInsight
true

showFeedbackConfig
true

showFeedbackSubmission
true

showSessionFiles
true

showAgendaStructure
true

Example Request
Get single session details
View More
curl
curl --location -g '{{host}}/user/class/{{class_id}}sessions/{{session_id}}?showLiveClassInsight=true&showFeedbackConfig=true&showFeedbackSubmission=true&showSessionFiles=true&showAgendaStructure=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get raw attendance in a course
{{host}}/user/classes/{{class_id}}/sessions/{{zoom_session_id}}/rawAttendance
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Example Request
Get raw attendance in a course
View More
curl
curl --location -g '{{host}}/user/classes/{{class_id}}/sessions/{{zoom_session_id}}/rawAttendance' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get all past sessions in institute
{{host}}/institutes/{{institute_id}}/sessions?paginateBy=COUNT&page_number=1&page_size=1&status=PAST
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
paginateBy
COUNT

page_number
1

page_size
1

status
PAST

Example Request
Get all past sessions in institute
View More
curl
curl --location -g 'https://api.wiseapp.live/institutes/{{institute_id}}/sessions?paginateBy=COUNT&page_number=1&page_size=1&status=PAST' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "sessions": [],
    "page_number": 1,
    "totalRecords": 0,
    "page_count": 0
  }
}
POST
Start a Zoom Registered Session
{{host}}/teacher/v2/goLive
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
	"classId": "{{class_id}}",
	"onBehalfOfVendorUserId": "{{vendor-user-id}}",
	"enableRegistration": false
}
Example Request
Start a Zoom Registered Session
curl
curl --location -g '{{host}}/teacher/v2/goLive' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
	"classId": "{{class_id}}",
	"onBehalfOfVendorUserId": "{{vendor-user-id}}",
	"enableRegistration": false
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Start a Lens Session (using External User ID)
{{host}}/teacher/v2/goLive
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "classId": "{{class_id}}",
    "onBehalfOfVendorUserId": "{{vendor-user-id}}",
    "registerLens": true
}
Example Request
Start a Lens Session (using External User ID)
curl
curl --location -g '{{host}}/teacher/v2/goLive' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "classId": "{{class_id}}",
    "onBehalfOfVendorUserId": "{{vendor-user-id}}",
    "registerLens": true
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Add Feedback for Completed Session
{{host}}/teacher/classes/{{class_id}}/session/{{session_id}}/feedback
AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "answers": [
        {
            "answer": "Answer for the Topics Covered Question"
        },
        {
            "answer": "Answer for the Comments Question"
        }
    ],
    "sessionStatus": "COMPLETED",
    "creditsConsumed": 1
}
Example Request
Add Feedback for Completed Session
View More
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/session/{{session_id}}/feedback' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "answers": [
        {
            "answer": "Answer for the Topics Covered Question"
        },
        {
            "answer": "Answer for the Comments Question"
        }
    ],
    "sessionStatus": "COMPLETED",
    "creditsConsumed": 1
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
End a Running Session
{{host}}/teacher/classes/{{class_id}}/sessions/{{session_id}}/end
AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Example Request
End a Running Session
View More
curl
curl --location -g --request POST '{{host}}/teacher/classes/{{class_id}}/sessions/{{session_id}}/end' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get Course Content
{{host}}/user/classes/{{class_id}}/contentTimeline?showSequentialLearningDisabledSections=true
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

PARAMS
showSequentialLearningDisabledSections
true

Example Request
Get Course Content
View More
curl
curl --location -g '{{host}}/user/classes/{{class_id}}/contentTimeline?showSequentialLearningDisabledSections=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
PUT
Import Template in Course Content
{{host}}/teacher/classes/{{class_id}}/importTemplate
Use this API to import pre-created templates into Course Content. All the sections and their items from the course template will be copied into the course content.

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "templateId": "66c580e0d71baab85XXXXXXX"
}
Example Request
Import Template in Course Content
View More
curl
curl --location -g --request PUT '{{host}}/teacher/classes/{{class_id}}/importTemplate' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "templateId": "66c580e0d71baab85XXXXXXX"
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Create a Test in Course Content
{{host}}/teacher/classes/{{class_id}}/proxy/addTest
Request Description
This endpoint allows you to add a test to a specific course

Request Parameters
type (string): The type of the test being created. When creating using APIs please set this as "UserInputOmrTest"

name (string): The name of the test

sectionId (string): The ID of the section to which the test belongs. This can be found from the Get Content & Sections API listed above in this folder

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "type":"UserInputOmrTest",
    "name":"Basic Test",
    "sectionId":"{{content_section_id}}"
}
Example Request
Create a Test in Course Content
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/proxy/addTest' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "type":"UserInputOmrTest",
    "name":"Basic Test",
    "sectionId":"{{content_section_id}}"
}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "success": true,
    "message": "New test created successfully!",
    "data": {
      "_id": {
        "$oid": "68517d4a3668450001ede106"
      },
      "type": "UserInputOmrTest",
      "class_id": {
        "$oid": "68516a2ebcd7c32372efef74"
      },
      "user_id": {
        "$oid": "683d93c6da4412797f8aeb01"
      },
      "name": "Basic Test",
      "description": null,
      "start_time": null,
      "end_time": null,
      "duration": null,
      "question_count": 0,
      "marking_schemes": {
        "MCQ_SINGLE_CORRECT": {
          "correct_marks": null,
          "incorrect_marks": null
        }
      },
      "max_marks": null,
      "status": "DRAFT",
      "questions": [],
      "test_question": [],
      "question_files": [],
      "answers": {},
      "analysis": null,
      "total_present": 0,
      "active": true,
      "created_at": "2025-06-17T14:35:54.210Z",
      "display_results": true,
      "jumbled_questions": false,
      "jumbled_options": false,
      "last_commented_at": null,
      "comments": [],
      "disable_commenting": false,
      "mock_test": false,
      "solution_count": 0,
      "solutions": [],
      "option_count": null,
      "sections": [],
      "retake": false,
      "pass_percent": null
    }
  }
}
POST
Add Questions
{{exam_host}}/api/v1/teacher/tests/{{test_id}}/questions
Request Description
This API endpoint allows teachers to add questions to a specific test identified by test_id. It is designed to facilitate the management of test content within the application.

Request Parameters
class_id (string): The unique identifier for the class to which the test belongs.

current_role (string): The role of the user making the request, which should be set to "teacher".

questions (array): An array of question objects, each containing:

text (string): The text of the question.

options (object): An object containing multiple choice options

answer (string): The correct answer option

question_type (string): The type of question. There are fours types that are accepted as "MCQ_SINGLE_CORRECT", "MCQ_MULTIPLE_CORRECT", "INTEGER_ANSWER", "FILL_IN_THE_BLANK"

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
View More
json
{
    "class_id": "{{class_id}}",
    "current_role": "teacher",
    "questions": [
        {
            "text": "Question 1",
            "options": {"a": "Red", "b": "Blue", "c": "Green", "d": "Black"},
            "answer": "b",
            "question_type": "MCQ_SINGLE_CORRECT"
        },
        {
            "text": "Question 2",
            "options": {"a": "Red", "b": "Blue", "c": "Green", "d": "Black"},
            "answer": "b,c",
            "question_type": "MCQ_MULTIPLE_CORRECT"
        },
        {
            "text": "Question 3",
            "answer": "4",
            "question_type": "INTEGER_ANSWER"
        },
        {
            "text": "Question 4",
            "answer": "new, old",
            "question_type": "FILL_IN_THE_BLANK"
        }
    ]
}
Example Request
Add Questions
View More
curl
curl --location -g '{{exam_host}}/api/v1/teacher/tests/{{test_id}}/questions' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "class_id": "{{class_id}}",
    "current_role": "teacher",
    "questions": [
        {
            "text": "Question 1",
            "options": {"a": "Red", "b": "Blue", "c": "Green", "d": "Black"},
            "answer": "b",
            "question_type": "MCQ_SINGLE_CORRECT"
        },
        {
            "text": "Question 2",
            "options": {"a": "Red", "b": "Blue", "c": "Green", "d": "Black"},
            "answer": "b,c",
            "question_type": "MCQ_MULTIPLE_CORRECT"
        },
        {
            "text": "Question 3",
            "answer": "4",
            "question_type": "INTEGER_ANSWER"
        },
        {
            "text": "Question 4",
            "answer": "new, old",
            "question_type": "FILL_IN_THE_BLANK"
        }
    ]
}'
200 OK
Example Response
Body
Headers (15)
View More
json
{
  "success": true,
  "message": "Questions added to test successfully!",
  "data": {
    "questions": [
      {
        "id": "68517d6f3668450001ede108",
        "text": "Question 1",
        "attachments": [],
        "options": {
          "a": "Red",
          "b": "Blue",
          "c": "Green",
          "d": "Black"
        },
        "answer": "b",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "MCQ_SINGLE_CORRECT"
      },
      {
        "id": "68517d6f3668450001ede109",
        "text": "Question 2",
        "attachments": [],
        "options": {
          "a": "Red",
          "b": "Blue",
          "c": "Green",
          "d": "Black"
        },
        "answer": "b,c",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "MCQ_MULTIPLE_CORRECT"
      },
      {
        "id": "68517d6f3668450001ede10a",
        "text": "Question 3",
        "attachments": [],
        "options": {},
        "answer": "4",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "INTEGER_ANSWER"
      },
      {
        "id": "68517d6f3668450001ede10b",
        "text": "Question 4",
        "attachments": [],
        "options": {},
        "answer": "new, old",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "FILL_IN_THE_BLANK"
      }
    ]
  }
}
PUT
Update Settings
{{exam_host}}/api/v2/teacher/tests/{{test_id}}
Request Description
This API endpoint allows you to update the details of a specific test

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
View More
json
{
    "class_id": "{{class_id}}",
    "user_id": "{{user_id}}",
    "current_role": "teacher",
    "test_type": "UserInputOmrTest",
    "test": {
        "name": "Basic Test",
        "description": "This is the description of the Basic Test",
        "max_marks": 13, 
        "duration": 20,
        "mock_test": true,
        "question_count": 4,
        "marking_schemes": {
            "MCQ_SINGLE_CORRECT": {
                "correct_marks": 4,
                "incorrect_marks": -1
            },
            "MCQ_MULTIPLE_CORRECT": {
                "correct_marks": 4,
                "incorrect_marks": 0
            },
            "INTEGER_ANSWER": {
                "correct_marks": 3,
                "incorrect_marks": 0
            },
            "FILL_IN_THE_BLANK": {
                "correct_marks": 2,
                "incorrect_marks": 0
            }
        }
    }
}
Example Request
Update Settings
View More
curl
curl --location -g --request PUT '{{exam_host}}/api/v2/teacher/tests/{{test_id}}' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "class_id": "{{class_id}}",
    "user_id": "{{user_id}}",
    "current_role": "teacher",
    "test_type": "UserInputOmrTest",
    "test": {
        "name": "Basic Test",
        "description": "This is the description of the Basic Test",
        "max_marks": 13, 
        "duration": 20,
        "mock_test": true,
        "question_count": 4,
        "marking_schemes": {
            "MCQ_SINGLE_CORRECT": {
                "correct_marks": 4,
                "incorrect_marks": -1
            },
            "MCQ_MULTIPLE_CORRECT": {
                "correct_marks": 4,
                "incorrect_marks": 0
            },
            "INTEGER_ANSWER": {
                "correct_marks": 3,
                "incorrect_marks": 0
            },
            "FILL_IN_THE_BLANK": {
                "correct_marks": 2,
                "incorrect_marks": 0
            }
        }
    }
}'
200 OK
Example Response
Body
Headers (15)
View More
json
{
  "success": true,
  "message": "Test updated successfully!",
  "data": {
    "_id": {
      "$oid": "68517d4a3668450001ede106"
    },
    "type": "UserInputOmrTest",
    "class_id": {
      "$oid": "68516a2ebcd7c32372efef74"
    },
    "user_id": {
      "$oid": "683d93c6da4412797f8aeb01"
    },
    "name": "Basic Test",
    "description": "This is the description of the Basic Test",
    "start_time": null,
    "end_time": null,
    "duration": 20,
    "question_count": 4,
    "marking_schemes": {
      "MCQ_SINGLE_CORRECT": {
        "correct_marks": 4,
        "incorrect_marks": -1
      },
      "MCQ_MULTIPLE_CORRECT": {
        "correct_marks": 4,
        "incorrect_marks": 0
      },
      "INTEGER_ANSWER": {
        "correct_marks": 3,
        "incorrect_marks": 0
      },
      "FILL_IN_THE_BLANK": {
        "correct_marks": 2,
        "incorrect_marks": 0
      }
    },
    "max_marks": 13,
    "status": "DRAFT",
    "questions": [
      {
        "id": "68517d6f3668450001ede108",
        "text": "Question 1",
        "attachments": [],
        "options": {
          "a": "Red",
          "b": "Blue",
          "c": "Green",
          "d": "Black"
        },
        "answer": "b",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "MCQ_SINGLE_CORRECT"
      },
      {
        "id": "68517d6f3668450001ede109",
        "text": "Question 2",
        "attachments": [],
        "options": {
          "a": "Red",
          "b": "Blue",
          "c": "Green",
          "d": "Black"
        },
        "answer": "b,c",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "MCQ_MULTIPLE_CORRECT"
      },
      {
        "id": "68517d6f3668450001ede10a",
        "text": "Question 3",
        "attachments": [],
        "options": {},
        "answer": "4",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "INTEGER_ANSWER"
      },
      {
        "id": "68517d6f3668450001ede10b",
        "text": "Question 4",
        "attachments": [],
        "options": {},
        "answer": "new, old",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "FILL_IN_THE_BLANK"
      }
    ],
    "test_question": [
      {
        "id": "68517d6f3668450001ede108",
        "text": "Question 1",
        "attachments": [],
        "options": {
          "a": "Red",
          "b": "Blue",
          "c": "Green",
          "d": "Black"
        },
        "answer": "b",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "MCQ_SINGLE_CORRECT"
      },
      {
        "id": "68517d6f3668450001ede109",
        "text": "Question 2",
        "attachments": [],
        "options": {
          "a": "Red",
          "b": "Blue",
          "c": "Green",
          "d": "Black"
        },
        "answer": "b,c",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "MCQ_MULTIPLE_CORRECT"
      },
      {
        "id": "68517d6f3668450001ede10a",
        "text": "Question 3",
        "attachments": [],
        "options": {},
        "answer": "4",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "INTEGER_ANSWER"
      },
      {
        "id": "68517d6f3668450001ede10b",
        "text": "Question 4",
        "attachments": [],
        "options": {},
        "answer": "new, old",
        "test_id": "68517d4a3668450001ede106",
        "test_type": "UserInputOmrTest",
        "class_id": "68516a2ebcd7c32372efef74",
        "user_id": "683d93c6da4412797f8aeb01",
        "question_type": "FILL_IN_THE_BLANK"
      }
    ],
    "question_files": [],
    "answers": {
      "68517d6f3668450001ede108": "b",
      "68517d6f3668450001ede109": "b,c",
      "68517d6f3668450001ede10a": "4",
      "68517d6f3668450001ede10b": "new, old"
    },
    "analysis": null,
    "total_present": 0,
    "active": true,
    "created_at": "2025-06-17T14:35:54.210Z",
    "display_results": true,
    "jumbled_questions": false,
    "jumbled_options": false,
    "last_commented_at": null,
    "comments": [],
    "disable_commenting": false,
    "mock_test": true,
    "solution_count": 0,
    "solutions": [],
    "option_count": null,
    "sections": [],
    "retake": false,
    "pass_percent": null
  }
}
PUT
Publish Test
{{exam_host}}/api/v1/teacher/tests/{{test_id}}/activate
Request Description
This API endpoint is used to activate a specific test It allows you to set a test as active, making it available for students to take.

Request Parameters
user_id (string): The unique identifier for the user (teacher) making the request.

current_role (string): The role of the user making the request, should be set to "teacher".

test_id (string): The unique identifier for the test that is to be activated.

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "class_id": "{{class_id}}",
    "user_id": "{{user_id}}",
    "current_role": "teacher",
    "test_id": "{{test_id}}"
}
Example Request
Publish Test
View More
curl
curl --location -g --request PUT '{{exam_host}}/api/v1/teacher/tests/{{test_id}}/activate' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "class_id": "{{class_id}}",
    "user_id": "{{user_id}}",
    "current_role": "teacher",
    "test_id": "{{test_id}}"
}'
200 OK
Example Response
Body
Headers (15)
View More
json
{
  "success": true,
  "message": "Test activated successfully!",
  "data": {
    "test": {
      "_id": {
        "$oid": "68517d4a3668450001ede106"
      },
      "type": "UserInputOmrTest",
      "class_id": {
        "$oid": "68516a2ebcd7c32372efef74"
      },
      "user_id": {
        "$oid": "683d93c6da4412797f8aeb01"
      },
      "name": "Basic Test",
      "description": "This is the description of the Basic Test",
      "start_time": null,
      "end_time": null,
      "duration": 20,
      "question_count": 4,
      "marking_schemes": {
        "MCQ_SINGLE_CORRECT": {
          "correct_marks": 4,
          "incorrect_marks": -1
        },
        "MCQ_MULTIPLE_CORRECT": {
          "correct_marks": 4,
          "incorrect_marks": 0
        },
        "INTEGER_ANSWER": {
          "correct_marks": 3,
          "incorrect_marks": 0
        },
        "FILL_IN_THE_BLANK": {
          "correct_marks": 2,
          "incorrect_marks": 0
        }
      },
      "max_marks": 13,
      "status": "GRADED",
      "questions": [
        {
          "id": "68517d6f3668450001ede108",
          "text": "Question 1",
          "attachments": [],
          "options": {
            "a": "Red",
            "b": "Blue",
            "c": "Green",
            "d": "Black"
          },
          "answer": "b",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "MCQ_SINGLE_CORRECT"
        },
        {
          "id": "68517d6f3668450001ede109",
          "text": "Question 2",
          "attachments": [],
          "options": {
            "a": "Red",
            "b": "Blue",
            "c": "Green",
            "d": "Black"
          },
          "answer": "b,c",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "MCQ_MULTIPLE_CORRECT"
        },
        {
          "id": "68517d6f3668450001ede10a",
          "text": "Question 3",
          "attachments": [],
          "options": {},
          "answer": "4",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "INTEGER_ANSWER"
        },
        {
          "id": "68517d6f3668450001ede10b",
          "text": "Question 4",
          "attachments": [],
          "options": {},
          "answer": "new, old",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "FILL_IN_THE_BLANK"
        }
      ],
      "test_question": [
        {
          "id": "68517d6f3668450001ede108",
          "text": "Question 1",
          "attachments": [],
          "options": {
            "a": "Red",
            "b": "Blue",
            "c": "Green",
            "d": "Black"
          },
          "answer": "b",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "MCQ_SINGLE_CORRECT"
        },
        {
          "id": "68517d6f3668450001ede109",
          "text": "Question 2",
          "attachments": [],
          "options": {
            "a": "Red",
            "b": "Blue",
            "c": "Green",
            "d": "Black"
          },
          "answer": "b,c",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "MCQ_MULTIPLE_CORRECT"
        },
        {
          "id": "68517d6f3668450001ede10a",
          "text": "Question 3",
          "attachments": [],
          "options": {},
          "answer": "4",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "INTEGER_ANSWER"
        },
        {
          "id": "68517d6f3668450001ede10b",
          "text": "Question 4",
          "attachments": [],
          "options": {},
          "answer": "new, old",
          "test_id": "68517d4a3668450001ede106",
          "test_type": "UserInputOmrTest",
          "class_id": "68516a2ebcd7c32372efef74",
          "user_id": "683d93c6da4412797f8aeb01",
          "question_type": "FILL_IN_THE_BLANK"
        }
      ],
      "question_files": [],
      "answers": {
        "68517d6f3668450001ede108": "b",
        "68517d6f3668450001ede109": "b,c",
        "68517d6f3668450001ede10a": "4",
        "68517d6f3668450001ede10b": "new, old"
      },
      "analysis": null,
      "total_present": 0,
      "active": true,
      "created_at": "2025-06-17T14:37:19.809Z",
      "display_results": true,
      "jumbled_questions": false,
      "jumbled_options": false,
      "last_commented_at": null,
      "comments": [],
      "disable_commenting": false,
      "mock_test": true,
      "solution_count": 0,
      "solutions": [],
      "option_count": null,
      "sections": [],
      "retake": false,
      "pass_percent": null
    }
  }
}
POST
Create Assessments in a Content Section
{{host}}/teacher/createAssignments
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "classId": "{{class_id}}",
    "sectionId": "{{content_section_id}}",
    "topic": "Assessment Title",
    "description": "Assessment Description",
    "maxMarks": "100",
    "submitBy": "2025-02-27T07:25:00.000Z",
    "startTime": "2025-02-25T07:25:00.000Z",
    "criteria": [
        {
            "title": "Criteria 1",
            "maxMarks": "50",
            "nameError": false,
            "maxMarksError": false
        },
        {
            "title": "Criteria 2",
            "maxMarks": "50",
            "nameError": false,
            "maxMarksError": false
        }
    ],
    "uploadTokens": []
}
Example Request
Create Assessments in a Content Section
View More
curl
curl --location -g '{{host}}/teacher/createAssignments' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "classId": "{{class_id}}",
    "sectionId": "{{content_section_id}}",
    "topic": "Assessment Title",
    "description": "Assessment Description",
    "maxMarks": "100",
    "submitBy": "2025-02-27T07:25:00.000Z",
    "startTime": "2025-02-25T07:25:00.000Z",
    "criteria": [
        {
            "title": "Criteria 1",
            "maxMarks": "50",
            "nameError": false,
            "maxMarksError": false
        },
        {
            "title": "Criteria 2",
            "maxMarks": "50",
            "nameError": false,
            "maxMarksError": false
        }
    ],
    "uploadTokens": []
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Evaluate Student Assessment Submission
{{host}}/teacher/giveMarksToAssignment
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "assignmentId": "{{assessment_id}}",
    "studentId": "{{studentId}}",
    "mark": 50,
    "feedBack": "Overall feedback from instructor",
    "feedbackFileTokens": "",
    "criteriaFeedback": [
        {
            "criteriaId": "{{ID for criteria 1 (Can be found when creating or fetching assessment}}",
            "marks": "25",
            "feedback": "Feedback for criteria 1"
        },
        {
            "criteriaId": "{{ID for criteria 2 (Can be found when creating or fetching assessment}}",
            "marks": "25",
            "feedback": "Feedback for criteria 2"
        }
    ]
}
Example Request
Evaluate Student Assessment Submission
View More
curl
curl --location -g '{{host}}/teacher/giveMarksToAssignment' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "assignmentId": "{{assessment_id}}",
    "studentId": "{{studentId}}",
    "mark": 50,
    "feedBack": "Overall feedback from instructor",
    "feedbackFileTokens": "",
    "criteriaFeedback": [
        {
            "criteriaId": "{{ID for criteria 1 (Can be found when creating or fetching assessment}}",
            "marks": "25",
            "feedback": "Feedback for criteria 1"
        },
        {
            "criteriaId": "{{ID for criteria 2 (Can be found when creating or fetching assessment}}",
            "marks": "25",
            "feedback": "Feedback for criteria 2"
        }
    ]
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get Content in Course
{{host}}/user/classes/{{class_id}}/contentTimeline?showSequentialLearningDisabledSections=true
AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

PARAMS
showSequentialLearningDisabledSections
true

Example Request
Get Content in Course
View More
curl
curl --location -g '{{host}}/user/classes/{{class_id}}/contentTimeline?showSequentialLearningDisabledSections=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "timeline": [
      {
        "_id": "667bbfcf58c626556ee26049",
        "sortKey": 1,
        "name": "Section 1",
        "entities": [
          {
            "_id": "667be9bce4ddd97133d3ce5a",
            "disableCommenting": false,
            "topic": "Write an essay",
            "description": "It should be 200 words",
            "maxMarks": 10,
            "submitBy": "2024-06-30T10:13:00.000Z",
            "attachments": [],
            "classId": "66793e7d47c290929e8779e5",
            "startTime": "2024-06-28T10:12:00.000Z",
            "createdAt": "2024-06-26T10:13:16.098Z",
            "updatedAt": "2024-06-26T10:13:16.098Z",
            "entityType": "assessment",
            "commentCount": 0,
            "submissionCount": 0,
            "backgroundImage": "https://cdn.wiseapp.live/marketing_template_resources/assessment/timeline_assessment.png",
            "markedCovered": false
          }
        ],
        "enabled": true,
        "entityCount": {
          "videos": 0,
          "documents": 0,
          "test": 0
        },
        "coveredPercent": 0
      }
    ],
    "dripSettings": "OFF",
    "sequentialLearning": false
  }
}
POST
Add a Section in Course Content
{{host}}/teacher/classes/{{class_id}}/sections
Add a Section in Course Content
Creates a new section within an existing class’s course content. Use this endpoint when you want to add a logical section (e.g., "Week 1", "Module 3", "Introduction") under a specific class.

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "name": "Section Name"
}
Example Request
Add a Section in Course Content
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/sections' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "name": "Section Name"
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Add Embedded Links in Content Section
{{host}}/teacher/createResourceInBulk
Add Embedded Links in Content Section
Creates one or more embedded/link resources within a specific content section for a class. Use this to attach external links (for example, files or videos hosted elsewhere) to a content section in a single request.

classId (string, required) - The unique identifier of the class.

sectionId (string, required) - The unique identifier of the content section within the class where the resources will be attached.

resources (array of objects, required) - List of resources to be created in bulk for the given section. Each item in the array has the following fields:

type (string, required) - High-level resource type. For embedded links, this is typically "embedded"

subtype (string, required) - For URL-based resources, this is typically "link"

name (string, required) - Display name or title of the resource as shown in the content section.

link (string, required) - Publicly accessible URL pointing to the external resource (for example, a video, document, or web page).

You can add multiple resource objects to the resources array to create several links in a single call.

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
View More
json
{
    "classId": "{{class_id}}",
    "sectionId": "{{content_section_id}}",
    "resources": [
        {
            "type": "embedded",
            "subtype": "link",
            "name": "File Name that shows in Content Section",
            "link": "https://xxxx-prod.s3.ap-south-1.amazonaws.com/public/***.MP4"
        }
    ]
}
Example Request
Add Embedded Links in Content Section
View More
curl
curl --location -g '{{host}}/teacher/createResourceInBulk' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "classId": "{{class_id}}",
    "sectionId": "{{content_section_id}}",
    "resources": [
        {
            "type": "embedded",
            "subtype": "link",
            "name": "File Name that shows in Content Section",
            "link": "https://xxxx-prod.s3.ap-south-1.amazonaws.com/public/***.MP4"
        }
    ]
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
Polls in your course
AUTHORIZATION
Basic Auth
This folder is using Basic Auth from collectionWise APIs
Discussions in your course
AUTHORIZATION
Basic Auth
This folder is using Basic Auth from collectionWise APIs
POST
Create a discussion
{{host}}/user/createAnnouncements
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "classId": "{{class_id}}",
    "title": "Welcome Students",
    "description": "Welcome to your course!",
    "disableCommenting": false,
    "uploadTokens": ""
}
Example Request
Create a discussion
View More
curl
curl --location -g '{{host}}/user/createAnnouncements' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "classId": "{{class_id}}",
    "title": "Welcome Students",
    "description": "Welcome to your course!",
    "disableCommenting": false,
    "uploadTokens": ""
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "New discussion added successfully!"
}
PUT
Update a discussion
{{host}}/user/editAnnouncements
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "announcementId": "{{announcement_id}}",
    "title": "Welcome Students",
    "description": "Welcome to your course again!",
    "attachments": "[]",
    "disableCommenting": false,
    "uploadTokens": ""
}
Example Request
Update a discussion
View More
curl
curl --location -g --request PUT '{{host}}/user/editAnnouncements' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "announcementId": "667be5a36e8e675b15166939",
    "title": "Welcome Students",
    "description": "Welcome to your course again!",
    "attachments": "[]",
    "disableCommenting": false,
    "uploadTokens": ""
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Discussion updated successfully!"
}
POST
Get all discussions
{{host}}/user/getAnnouncements
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "classId": "{{class_id}}"
}
Example Request
Get all discussions
curl
curl --location -g '{{host}}/user/getAnnouncements' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "classId": "{{class_id}}"
}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": [
    {
      "_id": "667be5a36e8e675b15166939",
      "disableCommenting": false,
      "pinnedDiscussion": false,
      "title": "Welcome Students",
      "description": "Welcome to your course!",
      "userId": "66793e38fa9c2a30cf1d2595",
      "classId": "66793e7d47c290929e8779e5",
      "date": "26/06/2024",
      "time": "03:25 PM",
      "createdAt": "2024-06-26T09:55:47.712Z",
      "creator": {
        "name": "Yugendra Dhariwal",
        "profilePicture": ""
      },
      "comment": 0,
      "attachmentsCount": 0,
      "canEdit": true,
      "canDelete": true
    }
  ]
}
GET
Get a single discussion
{{host}}/user/getAnnouncement/{{announcement_id}}
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Example Request
Get a single discussion
curl
curl --location -g '{{host}}/user/getAnnouncement/667be5a36e8e675b15166939' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "disableCommenting": false,
    "pinnedDiscussion": false,
    "poll": false,
    "pollData": {
      "showResults": false,
      "voteCount": 0
    },
    "_id": "667be5a36e8e675b15166939",
    "title": "Welcome Students",
    "description": "Welcome to your course!",
    "userId": {
      "name": "Yugendra Dhariwal",
      "profilePicture": "",
      "_id": "66793e38fa9c2a30cf1d2595",
      "phoneNumber": "+912900001111"
    },
    "classId": "66793e7d47c290929e8779e5",
    "attachments": [],
    "date": "26/06/2024",
    "time": "03:25 PM",
    "comments": [],
    "createdAt": "2024-06-26T09:55:47.712Z",
    "updatedAt": "2024-06-26T09:55:47.712Z",
    "__v": 0,
    "canEdit": true,
    "canDelete": true,
    "commentsCount": 0
  }
}
PUT
Assign Agenda To Room/Course
https://api.wiseapp.live/institutes/{{institute_id}}/agendas/{{agenda_id}}/assignAgendaToClassroom
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
content-type
application/json

user-agent
{{user-agent}}

x-wise-namespace
{{namespace}}

x-api-key
{{api_key}}

Body
raw (json)
json
{
    "classId": "{{class_id}}",
    "assign": true
}
Example Request
Assign Agenda To Room/Course
View More
curl
curl --location -g --request PUT 'https://api.wiseapp.live/institutes/{{institute_id}}/agendas/{{agenda_id}}/assignAgendaToClassroom' \
--header 'content-type: application/json' \
--header 'user-agent: {{user-agent}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'x-api-key: {{api_key}}' \
--data '{
    "classId": "{{class_id}}",
    "assign": true
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
PUT
Update an Agenda
https://api.wiseapp.live/institutes/{{institute_id}}/agendas/{{agenda_id}}
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
content-type
application/json

user-agent
{{user-agent}}

x-wise-namespace
{{namespace}}

x-api-key
{{api_key}}

Body
raw (json)
View More
json
{
    "title": "Introductory Session",
    "description": "Engage the learners and ask questions about their profession 2",
    "agendaItems": [
        {
            "type": "POLL",
            "data": {
                "question": "What is your profession?",
                "options": {
                    "A": {
                        "text": "Doctor"
                    },
                    "B": {
                        "text": "Nurse"
                    },
                    "C": {
                        "text": "Others"
                    }
                },
                "type": "POLL",
                "questionType": "SINGLE_CORRECT_ANSWER",
                "isWordCloud": false,
                "maxAnswers": 1
            }
        },
        {
            "type": "POLL",
            "data": {
                "question": "How did you find out about Aster Health Academy?",
                "type": "POLL",
                "questionType": "SHORT_ANSWER",
                "isWordCloud": false,
                "maxAnswers": 1
            }
        },
        {
            "type": "POLL",
            "data": {
                "question": "What do you want to gain from this course?",
                "type": "POLL",
                "questionType": "SHORT_ANSWER",
                "isWordCloud": true,
                "maxAnswers": 3
            }
        },
        {
            "type": "POLL",
            "data": {
                "question": "What is 2+2?",
                "options": {
                    "A": {
                        "text": "2"
                    },
                    "B": {
                        "text": "3"
                    },
                    "C": {
                        "text": "4"
                    },
                    "D": {
                        "text": "5"
                    }
                },
                "type": "QUIZ",
                "correctAnswers": [
                    "C"
                ],
                "questionType": "SINGLE_CORRECT_ANSWER",
                "isWordCloud": false,
                "maxAnswers": 1
            }
        }
    ]
}
Example Request
Update an Agenda
View More
curl
curl --location -g --request PUT 'https://api.wiseapp.live/institutes/{{institute_id}}/agendas/{{agenda_id}}' \
--header 'content-type: application/json' \
--header 'user-agent: {{user-agent}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'x-api-key: {{api_key}}' \
--data '{
    "title": "Introductory Session",
    "description": "Engage the learners and ask questions about their profession 2",
    "agendaItems": [
        {
            "type": "POLL",
            "data": {
                "question": "What is your profession?",
                "options": {
                    "A": {
                        "text": "Doctor"
                    },
                    "B": {
                        "text": "Nurse"
                    },
                    "C": {
                        "text": "Others"
                    }
                },
                "type": "POLL",
                "questionType": "SINGLE_CORRECT_ANSWER",
                "isWordCloud": false,
                "maxAnswers": 1
            }
        },
        {
            "type": "POLL",
            "data": {
                "question": "How did you find out about Aster Health Academy?",
                "type": "POLL",
                "questionType": "SHORT_ANSWER",
                "isWordCloud": false,
                "maxAnswers": 1
            }
        },
        {
            "type": "POLL",
            "data": {
                "question": "What do you want to gain from this course?",
                "type": "POLL",
                "questionType": "SHORT_ANSWER",
                "isWordCloud": true,
                "maxAnswers": 3
            }
        },
        {
            "type": "POLL",
            "data": {
                "question": "What is 2+2?",
                "options": {
                    "A": {
                        "text": "2"
                    },
                    "B": {
                        "text": "3"
                    },
                    "C": {
                        "text": "4"
                    },
                    "D": {
                        "text": "5"
                    }
                },
                "type": "QUIZ",
                "correctAnswers": [
                    "C"
                ],
                "questionType": "SINGLE_CORRECT_ANSWER",
                "isWordCloud": false,
                "maxAnswers": 1
            }
        }
    ]
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get Settings of a Lens Room
https://api.wiseapp.live/lens/classes/666b51f4733ac21926f79e82/settings
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Example Request
Get Settings of a Lens Room
View More
curl
curl --location 'https://api.wiseapp.live/lens/classes/666b51f4733ac21926f79e82/settings' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Start Lens with your Zoom links
{{host}}/teacher/v2/goLive
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
View More
json
{
    "classId": "{{class_id}}",
    "onBehalfOfVendorUserId": "{{vendor-user-id}}",
    "registerLens": true,
    "meetingData": {
        "startUrl": "Your zoom start URL",
        "joinUrl": "Your zoom join URL",
        "meetingUUID": "XXXXXXXXXX",
        "meetingId": "916XXXXXXX",
        "meetingPassword": "000000",
        "webinar": true,
        "licensed": true,
        "title": "Live session"
    }
}
Example Request
Start Lens with your Zoom links
View More
curl
curl --location -g '{{host}}/teacher/v2/goLive' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "classId": "{{class_id}}",
    "onBehalfOfVendorUserId": "{{vendor-user-id}}",
    "registerLens": true,
    "meetingData": {
        "startUrl": "Your zoom start URL",
        "joinUrl": "Your zoom join URL",
        "meetingUUID": "XXXXXXXXXX",
        "meetingId": "916XXXXXXX",
        "meetingPassword": "000000",
        "webinar": true,
        "licensed": true,
        "title": "Live session"
    }
}'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
POST
Add or Update Course Fees - Add Instalments by days
{{host}}/institutes/classes/{{class_id}}/fees
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "updateExistingInvoices": true,
    "currency": "INR",
    "paymentOptions": [
        {
            "type": "INSTALLMENT",
            "installments": [
                {
                    "dueAfterDays": 0,
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueAfterDays": 30,
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueAfterDays": 60,
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                }
            ]
        }
    ]
}
Example Request
Update Course Fees - Add Instalments by days
View More
curl
curl --location -g '{{host}}/institutes/classes/{{class_id}}/fees' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "updateExistingInvoices": true,
    "currency": "INR",
    "paymentOptions": [
        {
            "type": "INSTALLMENT",
            "installments": [
                {
                    "dueAfterDays": 0,
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueAfterDays": 30,
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueAfterDays": 60,
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                }
            ]
        }
    ]
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Fees updated successfully"
}
POST
Add or Update Course Fees - Add Instalments by date
{{host}}/institutes/classes/{{class_id}}/fees
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
View More
json
{
    "updateExistingInvoices": true,
    "currency": "INR",
    "paymentOptions": [
        {
            "_id": "667bcdd1c4e7098767892090",
            "type": "INSTALLMENT",
            "installments": [
                {
                    "_id": "667bcdd1c4e709ffda892091",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    },
                    "index": 1,
                    "dueOn": "2024-06-27T00:00:00.000Z"
                },
                {
                    "dueOn": "2024-07-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-08-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                }
            ],
            "totalAmount": {
                "value": 300000,
                "currency": "INR"
            },
            "updatedAt": "2024-06-26T08:14:09.577Z",
            "createdAt": "2024-06-26T08:14:09.577Z"
        }
    ]
}
Example Request
Update Course Fees - Add Instalments by days
View More
curl
curl --location -g '{{host}}/institutes/classes/{{class_id}}/fees' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "updateExistingInvoices": true,
    "currency": "INR",
    "paymentOptions": [
        {
            "_id": "667bcdd1c4e7098767892090",
            "type": "INSTALLMENT",
            "installments": [
                {
                    "_id": "667bcdd1c4e709ffda892091",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    },
                    "index": 1,
                    "dueOn": "2024-06-27T00:00:00.000Z"
                },
                {
                    "dueOn": "2024-07-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-08-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                }
            ],
            "totalAmount": {
                "value": 300000,
                "currency": "INR"
            },
            "updatedAt": "2024-06-26T08:14:09.577Z",
            "createdAt": "2024-06-26T08:14:09.577Z"
        }
    ]
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Fees updated successfully"
}
POST
Add or Update Student Fees
{{host}}/institutes/{{institute_id}}/classes/{{class_id}}/addOrUpdateStudentFees
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
View More
json
{
    "studentId": "{{student_id}}",
    "currency": "INR",
    "paymentOptions": [
        {
            "type": "INSTALLMENT",
            "installments": [
                {
                    "dueOn": "2024-06-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-07-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-08-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-09-27",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                }
            ]
        }
    ]
}
Example Request
Add or Update Student Fees
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/classes/{{class_id}}/addOrUpdateStudentFees' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "studentId": "{{student_id}}",
    "currency": "INR",
    "paymentOptions": [
        {
            "type": "INSTALLMENT",
            "installments": [
                {
                    "dueOn": "2024-06-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-07-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-08-27T00:00:00.000Z",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                },
                {
                    "dueOn": "2024-09-27",
                    "amount": {
                        "value": 100000,
                        "currency": "INR"
                    }
                }
            ]
        }
    ]
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Fees updated successfully"
}
POST
Add offline transaction for student
{{host}}/teacher/classes/{{class_id}}/transactions
This endpoint allows you to add a transaction for a specific student in a specific class. It is used to record payments made by students outside the platform

The request body must include the following parameters:

studentId (string): The unique identifier of the student making the payment.

amount (number): The amount of money being paid. This should be specified in paise or cents

note (string): This should be "Marked as paid".

invoiceId (string): The unique identifier for the invoice associated with this transaction. This should match the actual invoice Id created for the student in the course.

type (string): The type of payment being made. In this case, it should be set to "OFFLINE_PAYMENT"

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "studentId": "{{student_id}}",
    "amount": 100000,
    "note": "Marked as paid",
    "type": "OFFLINE_PAYMENT"
}
Example Request
Add manual transaction for student
curl
curl --location -g '{{host}}/teacher/classes/{{class_id}}/transactions' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "studentId": "{{student_id}}",
    "amount": 100000,
    "note": "Marked as paid",
    "type": "OFFLINE_PAYMENT"
}'
200 OK
Example Response
Body
Headers (12)
json
{
  "status": 200,
  "message": "Success",
  "data": "Transaction added successfully!"
}
POST
Course Chat with Student (Teacher added as Chat Participant)
{{host}}/institutes/{{institute_id}}/chats
Generated from cURL: curl --location 'https://api.wiseapp.live/institutes/62024a277a701b9d1444f2d2/chats'
--header 'user-agent: wiseapp internal'
--header 'x-api-key: 7fc0f2a1bcb0295e1ca466a279adaad4'
--header 'Content-Type: application/json'
--header 'Authorization: ••••••'
--data '{ "chatType": "INSTITUTE", "chatWithId": "61f923a8f0f6c157af6bf26a" }'

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

Authorization
••••••

x-wise-namespace
{{namespace}}

Body
raw (json)
json
{
    "chatType": "CLASSROOM",
    "chatWithId": "{{student_id}}",
    "classId": "{{class_id}}"
}
Example Request
Course Chat with Student (Teacher added as Chat Participant)
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/chats' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'Authorization: ••••••' \
--header 'x-wise-namespace: {{namespace}}' \
--data '{
    "chatType": "CLASSROOM",
    "chatWithId": "{{student_id}}",
    "classId": "{{class_id}}"
}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "chat": {
      "_id": "67d81fd91212d98ff59779bd",
      "instituteId": "66793e38fa9c2a40d81d259a",
      "chatWithId": "667bbfae567ebeb8fbcbbf4f",
      "chatType": "CLASSROOM",
      "createdAt": "2025-03-17T13:12:57.112Z",
      "participants": [
        {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profile": "teacher",
          "profilePicture": "",
          "relation": "OWNER",
          "status": "ACCEPTED"
        },
        {
          "_id": "667bbfae567ebeb8fbcbbf4f",
          "name": "student001",
          "profile": "student",
          "profilePicture": "https://cdn.wiseapp.live/images/institute_thumbnail/4.png",
          "relation": "STUDENT",
          "status": "REMOVED"
        },
        {
          "_id": "667bc35a127bd4f9b7590814",
          "name": "Shyam Sharma",
          "profile": "teacher",
          "profilePicture": "",
          "relation": "TEACHER",
          "status": "ACCEPTED"
        }
      ],
      "updatedAt": "2025-03-17T13:12:57.112Z",
      "class": {
        "_id": "66793e7d47c290929e8779e5",
        "subject": "Sample Subject",
        "name": "Sample Course",
        "classCovers": [
          {
            "type": "image",
            "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png"
          }
        ]
      }
    },
    "messages": [],
    "page_number": 1,
    "page_size": 100
  }
}
GET
Get All Chats
{{host}}/institutes/{{institute_id}}/chats?page_number=1&page_size=20&chatSection=all_chats
Generated from cURL: curl 'https://api.wiseapp.live/institutes/62024a277a701b9d1444f2d2/chats?page_number=1&page_size=20&chatSection=all_chats'
-H 'accept: application/json, text/plain, /'
-H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8'
-H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZjkzM2E2OGYwZDBmZTZhZWY3ZjM5NDgiLCJuYW1lIjoiVXRrYXJzaCBHdXB0YSIsInR5cGUiOiJTRVNTSU9OX1RPS0VOIiwiaWF0IjoxNzQwNTA2NDk0LCJleHAiOjE3NDgyODI0OTR9.A0FNkW19q4BIHCMtngDvODWcgYbWZDU1gIoy59BAp_U'
-H 'origin: https://web.wise.live'
-H 'priority: u=1, i'
-H 'referer: https://web.wise.live/'
-H 'sec-ch-ua: "Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"'
-H 'sec-ch-ua-mobile: ?0'
-H 'sec-ch-ua-platform: "macOS"'
-H 'sec-fetch-dest: empty'
-H 'sec-fetch-mode: cors'
-H 'sec-fetch-site: cross-site'
-H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
-H 'x-api-key: web:aff7589260fd9f8ba437674d25225728'
-H 'x-wise-app-version: release_1742197281'
-H 'x-wise-namespace: wise'
-H 'x-wise-platform: web'
-H 'x-wise-timezone: Asia/Calcutta'
-H 'x-wise-uuid: 8dffb999-d097-492b-8ecf-b9406bf4150c'
-H 'x-wise-web-version: release_1742197281'

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

Authorization
••••••

x-wise-namespace
{{namespace}}

PARAMS
page_number
1

page_size
20

chatSection
all_chats

Example Request
Get All Chats
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/chats?page_number=1&page_size=20&chatSection=all_chats' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'Authorization: ••••••' \
--header 'x-wise-namespace: {{namespace}}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "chats": [
      {
        "_id": "67d81fb81212d98ff5976695",
        "chatWithId": {
          "_id": "667bbfae567ebeb8fbcbbf4f",
          "name": "student001",
          "profile": "student",
          "profilePicture": "https://cdn.wiseapp.live/images/institute_thumbnail/4.png"
        },
        "chatType": "INSTITUTE",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "lastMessage": {
          "_id": "67d82157f1cf8e0a749266b1",
          "message": "Hello",
          "createdAt": "2025-03-17T13:19:19.885Z",
          "sender": {
            "_id": "66793e38fa9c2a30cf1d2595",
            "name": "Yugendra Dhariwal",
            "profile": "teacher",
            "profilePicture": ""
          }
        },
        "numParticipants": 2,
        "unreadCount": 0,
        "class": {}
      }
    ],
    "chatSection": "all_chats",
    "page_number": 1,
    "page_size": 20,
    "totalPages": 1,
    "sectionWiseCounts": {
      "user_chats": 1,
      "user_unread_chats": 0,
      "admin_only_chats": 1,
      "all_chats": 1
    }
  }
}
GET
Get Chat by Chat ID
{{host}}/institutes/{{institute_id}}/chats/{{chatId}}?page_number=1&page_size=100
Generated from cURL: curl 'https://api.wiseapp.live/institutes/62024a277a701b9d1444f2d2/chats/67cd9a90ed8b9119b823c013?page_number=1&page_size=100'
-H 'accept: application/json, text/plain, /'
-H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8'
-H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZjkzM2E2OGYwZDBmZTZhZWY3ZjM5NDgiLCJuYW1lIjoiVXRrYXJzaCBHdXB0YSIsInR5cGUiOiJTRVNTSU9OX1RPS0VOIiwiaWF0IjoxNzQwNTA2NDk0LCJleHAiOjE3NDgyODI0OTR9.A0FNkW19q4BIHCMtngDvODWcgYbWZDU1gIoy59BAp_U'
-H 'origin: https://web.wise.live'
-H 'priority: u=1, i'
-H 'referer: https://web.wise.live/'
-H 'sec-ch-ua: "Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"'
-H 'sec-ch-ua-mobile: ?0'
-H 'sec-ch-ua-platform: "macOS"'
-H 'sec-fetch-dest: empty'
-H 'sec-fetch-mode: cors'
-H 'sec-fetch-site: cross-site'
-H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
-H 'x-api-key: web:aff7589260fd9f8ba437674d25225728'
-H 'x-wise-app-version: release_1742197281'
-H 'x-wise-namespace: wise'
-H 'x-wise-platform: web'
-H 'x-wise-timezone: Asia/Calcutta'
-H 'x-wise-uuid: 8dffb999-d097-492b-8ecf-b9406bf4150c'
-H 'x-wise-web-version: release_1742197281'

AUTHORIZATION
Basic Auth
Username
{{user_id}}

Password
{{api_key}}

HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

Content-Type
application/json

Authorization
••••••

x-wise-namespace
{{namespace}}

PARAMS
page_number
1

page_size
100

Example Request
Get Chat by Chat ID
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/chats/67d81fb81212d98ff5976695?page_number=1&page_size=100' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'Content-Type: application/json' \
--header 'Authorization: ••••••' \
--header 'x-wise-namespace: {{namespace}}'
200 OK
Example Response
Body
Headers (12)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "chat": {
      "_id": "67d81fb81212d98ff5976695",
      "chatWithId": "667bbfae567ebeb8fbcbbf4f",
      "chatType": "INSTITUTE",
      "instituteId": "66793e38fa9c2a40d81d259a",
      "createdAt": "2025-03-17T13:12:24.561Z",
      "participants": [
        {
          "_id": "66793e38fa9c2a30cf1d2595",
          "name": "Yugendra Dhariwal",
          "profile": "teacher",
          "profilePicture": "",
          "relation": "OWNER",
          "status": "ACCEPTED"
        },
        {
          "_id": "667bbfae567ebeb8fbcbbf4f",
          "name": "student001",
          "profile": "student",
          "profilePicture": "https://cdn.wiseapp.live/images/institute_thumbnail/4.png",
          "relation": "STUDENT",
          "status": "REMOVED"
        }
      ],
      "updatedAt": "2025-03-17T13:12:24.561Z"
    },
    "messages": [],
    "page_number": 1,
    "page_size": 100
  }
}
GET
Get all upcoming consultation sessions
{{host}}/institutes/66793e38fa9c2a40d81d259a/demoRooms/sessions?status=FUTURE&page_number=1&page_size=50&populateSessionAttendees=true
This endpoint retrieves the details of a user session including live class insight, feedback configuration, feedback submission, session files, and agenda structure.

Request
Path Parameters
session_id (string, required): The unique identifier of the user session.
Query Parameters
showLiveClassInsight (boolean, optional): Set to true to include live class insight in the response.

showFeedbackConfig (boolean, optional): Set to true to include feedback configuration in the response.

showFeedbackSubmission (boolean, optional): Set to true to include feedback submission in the response.

showSessionFiles (boolean, optional): Set to true to include session files like transcript, session summary etc. in the response.

showAgendaStructure (boolean, optional): Set to true to include agenda structure in the response

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
status
FUTURE

page_number
1

page_size
50

populateSessionAttendees
true

Example Request
Get all upcoming consultation sessions
View More
curl
curl --location -g '{{host}}/institutes/66793e38fa9c2a40d81d259a/demoRooms/sessions?status=FUTURE&page_number=1&page_size=50&populateSessionAttendees=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "sessions": [
      {
        "_id": "68871c041c96254ec33ff15f",
        "classId": "68871c041c96254ec33ff14f",
        "userId": {
          "_id": "686b7d517c49d0a2e784e025",
          "name": "Amit Sharma",
          "profilePicture": ""
        },
        "start_time": "2025-07-30T05:00:00.000Z",
        "end_time": null,
        "scheduledEndTime": "2025-07-30T05:45:00.000Z",
        "title": "Maths Demo",
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "createdAt": "2025-07-28T06:43:16.609Z",
        "classroom": {
          "_id": "68871c041c96254ec33ff14f",
          "name": "Consultations",
          "classCovers": [
            {
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-11.png",
              "type": "image"
            }
          ],
          "settings": {
            "disableStudentDiscussions": false,
            "disableStudentComments": false,
            "lockClassroom": false,
            "lockAfter": 0,
            "openClassroom": false,
            "admissionsDisabled": false,
            "autoAccept": false,
            "validityInDays": -1,
            "provideCertification": false,
            "videoPlayRestriction": -1,
            "magicJoinTokenConfig": {
              "enabledOn": "2025-07-28T06:43:16.577Z",
              "token": "68871c041c96254ec33ff14f48249972",
              "loginRequired": false,
              "registrationRequired": false
            }
          }
        },
        "demoRoom": {
          "_id": "687dd7e9da592050331d3247",
          "name": "Maths Demo",
          "classCovers": [
            {
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png",
              "type": "image"
            }
          ],
          "settings": {
            "disableStudentDiscussions": false,
            "disableStudentComments": false,
            "lockClassroom": false,
            "lockAfter": 0,
            "openClassroom": false,
            "admissionsDisabled": false,
            "autoAccept": false,
            "studentSlotBooking": {
              "sessionDurationMins": 45
            },
            "validityInDays": -1,
            "provideCertification": false,
            "videoPlayRestriction": -1,
            "magicJoinTokenConfig": {
              "enabledOn": "2025-07-21T06:02:17.576Z",
              "token": "687dd7e9da592050331d324763464352",
              "loginRequired": false,
              "registrationRequired": false
            },
            "notificationSettings": {
              "DemoSessionReminder_10": true,
              "DemoSessionReminder_60": true,
              "DemoSessionReminder_1440": true,
              "DemoSessionUpdated": true
            }
          }
        },
        "students": [
          {
            "_id": "68871c040933d0d6199ea98b",
            "name": "Sam",
            "profilePicture": ""
          }
        ]
      },
      {
        "_id": "68871c3ad56a897ea00906fe",
        "classId": "68871c041c96254ec33ff14f",
        "userId": {
          "_id": "686b7d517c49d0a2e784e025",
          "name": "Amit Sharma",
          "profilePicture": ""
        },
        "start_time": "2025-07-31T07:30:00.000Z",
        "end_time": null,
        "scheduledEndTime": "2025-07-31T08:15:00.000Z",
        "title": "Maths Demo",
        "type": "SCHEDULED",
        "meetingStatus": "UPCOMING",
        "createdAt": "2025-07-28T06:44:10.685Z",
        "classroom": {
          "_id": "68871c041c96254ec33ff14f",
          "name": "Consultations",
          "classCovers": [
            {
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-11.png",
              "type": "image"
            }
          ],
          "settings": {
            "disableStudentDiscussions": false,
            "disableStudentComments": false,
            "lockClassroom": false,
            "lockAfter": 0,
            "openClassroom": false,
            "admissionsDisabled": false,
            "autoAccept": false,
            "validityInDays": -1,
            "provideCertification": false,
            "videoPlayRestriction": -1,
            "magicJoinTokenConfig": {
              "enabledOn": "2025-07-28T06:43:16.577Z",
              "token": "68871c041c96254ec33ff14f48249972",
              "loginRequired": false,
              "registrationRequired": false
            }
          }
        },
        "demoRoom": {
          "_id": "687dd7e9da592050331d3247",
          "name": "Maths Demo",
          "classCovers": [
            {
              "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-7.png",
              "type": "image"
            }
          ],
          "settings": {
            "disableStudentDiscussions": false,
            "disableStudentComments": false,
            "lockClassroom": false,
            "lockAfter": 0,
            "openClassroom": false,
            "admissionsDisabled": false,
            "autoAccept": false,
            "studentSlotBooking": {
              "sessionDurationMins": 45
            },
            "validityInDays": -1,
            "provideCertification": false,
            "videoPlayRestriction": -1,
            "magicJoinTokenConfig": {
              "enabledOn": "2025-07-21T06:02:17.576Z",
              "token": "687dd7e9da592050331d324763464352",
              "loginRequired": false,
              "registrationRequired": false
            },
            "notificationSettings": {
              "DemoSessionReminder_10": true,
              "DemoSessionReminder_60": true,
              "DemoSessionReminder_1440": true,
              "DemoSessionUpdated": true
            }
          }
        },
        "students": [
          {
            "_id": "68871c3a0933d0d6199ece0f",
            "name": "Gautam",
            "profilePicture": ""
          }
        ]
      }
    ],
    "totalRecords": 2,
    "page_count": 1,
    "page_number": 1,
    "page_size": 50
  }
}
GET
Get all past consultation sessions
{{host}}/institutes/66793e38fa9c2a40d81d259a/demoRooms/sessions?status=PAST&page_number=1&page_size=50&populateSessionAttendees=true
This endpoint retrieves the details of a user session including live class insight, feedback configuration, feedback submission, session files, and agenda structure.

Request
Path Parameters
session_id (string, required): The unique identifier of the user session.
Query Parameters
showLiveClassInsight (boolean, optional): Set to true to include live class insight in the response.

showFeedbackConfig (boolean, optional): Set to true to include feedback configuration in the response.

showFeedbackSubmission (boolean, optional): Set to true to include feedback submission in the response.

showSessionFiles (boolean, optional): Set to true to include session files like transcript, session summary etc. in the response.

showAgendaStructure (boolean, optional): Set to true to include agenda structure in the response

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
status
PAST

page_number
1

page_size
50

populateSessionAttendees
true

Example Request
Get all past consultation sessions
View More
curl
curl --location -g '{{host}}/institutes/66793e38fa9c2a40d81d259a/demoRooms/sessions?status=PAST&page_number=1&page_size=50&populateSessionAttendees=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
GET
Get single consultation session details
{{host}}/user/session/{{session_id}}?showFeedbackConfig=true&showFeedbackSubmission=true&showSessionFiles=true&showSessionAttendees=true&showRegistrationFormSubmission=true
This endpoint retrieves the details of a user session including live class insight, feedback configuration, feedback submission, session files, and agenda structure.

Request
Path Parameters
session_id (string, required): The unique identifier of the user session.
Query Parameters
showLiveClassInsight (boolean, optional): Set to true to include live class insight in the response.

showFeedbackConfig (boolean, optional): Set to true to include feedback configuration in the response.

showFeedbackSubmission (boolean, optional): Set to true to include feedback submission in the response.

showSessionFiles (boolean, optional): Set to true to include session files like transcript, session summary etc. in the response.

showAgendaStructure (boolean, optional): Set to true to include agenda structure in the response

AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

PARAMS
showFeedbackConfig
true

showFeedbackSubmission
true

showSessionFiles
true

showSessionAttendees
true

showRegistrationFormSubmission
true

Example Request
Get single consultation session details
View More
curl
curl --location -g '{{host}}/user/session/{{session_id}}?showFeedbackConfig=true&showFeedbackSubmission=true&showSessionFiles=true&showSessionAttendees=true&showRegistrationFormSubmission=true' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
200 OK
Example Response
Body
Headers (13)
View More
json
{
  "status": 200,
  "message": "Success",
  "data": {
    "_id": "68871c3ad56a897ea00906fe",
    "attendanceRecorded": false,
    "mettingEnded": false,
    "classId": "68871c041c96254ec33ff14f",
    "userId": {
      "_id": "686b7d517c49d0a2e784e025",
      "name": "Amit Sharma",
      "profilePicture": ""
    },
    "start_time": "2025-07-31T07:30:00.000Z",
    "end_time": null,
    "attendees": [
      {
        "_id": "68871c3a0933d0d6199ece0f",
        "email": "gautam@wise.live",
        "name": "Gautam",
        "profilePicture": "",
        "settings": {
          "timezone": "Asia/Kolkata"
        }
      }
    ],
    "disableCommenting": false,
    "metadata": {
      "demoClassId": "687dd7e9da592050331d3247"
    },
    "scheduledStartTime": "2025-07-31T07:30:00.000Z",
    "scheduledEndTime": "2025-07-31T08:15:00.000Z",
    "title": "Maths Demo",
    "type": "SCHEDULED",
    "recordings": [],
    "meetingStatus": "UPCOMING",
    "participants": [],
    "comments": [],
    "rawRecordings": [],
    "createdAt": "2025-07-28T06:44:10.685Z",
    "rawChats": [],
    "rawMeetingSummary": [],
    "rawTranscript": [],
    "registrationForm": {
      "_id": "687dd7e90933d0d619a3a798",
      "instituteId": "66793e38fa9c2a40d81d259a",
      "classId": "687dd7e9da592050331d3247",
      "__v": 0,
      "createdAt": "2025-07-21T06:02:17.583Z",
      "enabled": true,
      "fields": [
        {
          "questionText": "Name",
          "questionId": "user_name",
          "required": true,
          "type": "TEXT"
        },
        {
          "questionText": "Phone Number",
          "questionId": "user_phone_number",
          "required": false,
          "type": "PHONE"
        },
        {
          "questionText": "Email",
          "questionId": "user_email",
          "required": true,
          "type": "EMAIL"
        }
      ],
      "settings": {
        "requiredForStudents": true,
        "disableUpdatingSubmission": false
      },
      "updatedAt": "2025-07-21T06:02:17.583Z"
    },
    "registrationFormSubmissions": [
      {
        "_id": "68871c3a0933d0d6199ece2f",
        "instituteId": "66793e38fa9c2a40d81d259a",
        "userId": "68871c3a0933d0d6199ece0f",
        "classId": "687dd7e9da592050331d3247",
        "__v": 0,
        "answers": [
          {
            "questionId": "user_name",
            "answer": "Gautam"
          },
          {
            "questionId": "user_phone_number",
            "answer": "+918989891291"
          },
          {
            "questionId": "user_email",
            "answer": "gautam@wise.live"
          }
        ],
        "createdAt": "2025-07-28T06:44:10.704Z",
        "status": "SUBMITTED",
        "updatedAt": "2025-07-28T06:44:10.704Z"
      }
    ],
    "commentsCount": 0,
    "className": "Consultations",
    "classNumber": 197677146,
    "classThumbnail": "https://cdn.wiseapp.live/images/classroom_thumbnails/generic-71.png",
    "classCovers": [
      {
        "link": "https://cdn.wiseapp.live/images/classroom_covers/generic-11.png",
        "type": "image"
      }
    ],
    "classType": "PERSONAL",
    "backgroundImage": "https://cdn.wiseapp.live/marketing_template_resources/session/session_card.png",
    "saved": false,
    "canRestart": false,
    "feedbackForm": {
      "_id": "66cd89861b8cfb1ae650c8d1",
      "profile": "teacher",
      "commentText": null,
      "enabled": true,
      "questions": [
        {
          "required": false,
          "_id": "66cd8afaa076e73b02bb8a6f",
          "questionText": "Was this a demo? (Optional)",
          "type": "SHORT_ANSWER"
        },
        {
          "required": false,
          "_id": "66cd8afaa076e7833fbb8a70",
          "type": "SHORT_ANSWER",
          "questionText": "Topics covered"
        },
        {
          "required": false,
          "_id": "66cd8afaa076e79910bb8a71",
          "type": "LONG_ANSWER",
          "questionText": "Comments"
        }
      ]
    },
    "feedbackSubmissions": [],
    "startTime": "2025-07-31T07:30:00.000Z",
    "endTime": null
  }
}
POST
Marking Credits as Consumed for Student
{{host}}/institutes/{{institute_id}}/classes/{{class_id}}/students/{{student_id}}/sessionCredits
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Body
raw (json)
json
{
    "credit": "2",
    "note": "Consuming Credits",
    "type": "DEBIT"
}
Example Request
Marking Credits as Consumed for Student
View More
curl
curl --location -g '{{host}}/institutes/{{institute_id}}/classes/{{class_id}}/students/{{student_id}}/sessionCredits' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json' \
--data '{
    "credit": "2",
    "note": "Consuming Credits",
    "type": "DEBIT"
}'
200 OK
Example Response
Body
Headers (12)
View More
{
  "status": 200,
  "message": "Success",
  "data": {
    "sessionCredits": {
      "classId": "68e787ccc6685941d61144a8",
      "userId": "68e787ccb9932c954a1c67d0",
      "instituteId": "66793e38fa9c2a40d81d259a",
      "assignedBy": "66793e38fa9c2a30cf1d2595",
      "credit": 2,
      "note": "Consuming Credits",
      "type": "DEBIT",
      "_id": "6912ea78835259c558f06735",
      "createdAt": "2025-11-11T07:49:12.181Z",
      "updatedAt": "2025-11-11T07:49:12.181Z",
      "__v": 0
    }
  }
}
GET
Student Reports
https://api.wiseapp.live/public/institutes/{{institute_id}}/studentReports/{{student_id}}
AUTHORIZATION
Basic Auth
This request is using Basic Auth from collectionWise APIs
HEADERS
user-agent
{{user-agent}}

x-api-key
{{api_key}}

x-wise-namespace
{{namespace}}

Content-Type
application/json

Example Request
Student Reports
View More
curl
curl --location -g 'https://api.wiseapp.live/public/institutes/{{institute_id}}/studentReports/{{student_id}}' \
--header 'user-agent: {{user-agent}}' \
--header 'x-api-key: {{api_key}}' \
--header 'x-wise-namespace: {{namespace}}' \
--header 'Content-Type: application/json'
Example Response
Body
Headers (0)
No response body
This request doesn't return any response body
