# Connecting Firebase to SAFAST

Until this is done, accounts run in **demo mode** (saved only in the visitor's browser). Everything else in the app works the same.

## 1. Create the project
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it `safast`.
2. **Build → Authentication → Get started → Email/Password → Enable** (leave "Email link" off).
   Then **Add new provider → Google → Enable**, pick a support email, **Save**. If a "Download latest configuration file" window appears, click **Done** — it is only for native Android/iOS apps, not the website.
3. **Authentication → Settings → Authorized domains → Add domain**: `safast.app` (and `www.safast.app` if you use it).
4. **Build → Firestore Database → Create database** → production mode → pick a region near your users (e.g. `us-east1`).

## 2. Security rules
**Firestore → Rules**, replace everything with the contents of `firestore.rules`, then **Publish**.

These rules mean:
- each person can only read and write their own profile;
- a guardian can read someone's profile **only** if that person turned on sharing **and** added the guardian's email **and** the guardian has verified that email;
- anyone can read **approved** community posts; signed-in people can submit posts, which wait for review; only admins can approve; authors and admins can delete;
- signed-in people can report a post; only admins see reports.

> If you published the rules before community posts existed, paste them again — the new version adds `posts`, `reports` and `admins`.

## 3. Index for "People you care for"
The caregiver list runs this query: `guardianEmails array-contains <email>` + `shareWithGuardians == true`.
The first time a caregiver opens their profile, Firestore may say an index is needed — open the browser console, click the link in the error, and press **Create index**. It takes a minute to build.

### Indexes for community posts
The Community page runs two more queries that need indexes:
- approved posts, newest first: `posts` → `status` Ascending + `createdAt` Descending
- the admin review queue: `posts` → `status` Ascending + `createdAt` Ascending

Create both in **Firestore → Indexes → Composite → Create index** (Collection ID `posts`, Query scope *Collection*), or open Community once, open the browser console and click the link in the error. Until the first index finishes, the page says posts couldn't load.

## 3b. Make yourself an admin (to approve posts)
1. Sign in to safast.app once with your account.
2. Firebase console → **Authentication → Users** → copy your **User UID**.
3. **Firestore → Data → Start collection** → Collection ID `admins` → Document ID: paste your UID → add any field (e.g. `name` = `Jon`) → **Save**.
4. Reload the Community page. A **Review posts** panel appears with every post waiting for approval and any reports. Tap **Approve** to publish a post, or **Delete** to reject it.

Repeat step 3 for each person who should moderate. Remove their document to take the role away.

## 4. Paste the config
**Project settings (gear) → Your apps → Web (`</>`) → Register app** → copy the `firebaseConfig` object.
In `index.html`, find `const FIREBASE_CONFIG = null;` and replace `null` with it:

```js
const FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "safast-xxxx.firebaseapp.com",
  projectId: "safast-xxxx",
  storageBucket: "safast-xxxx.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
```

This config is meant to be public — it identifies the project; the rules above are what protect the data.

## 5. Emails (optional polish)
**Authentication → Templates**: set the sender name to "SAFAST" and edit the verification and password-reset emails.

## Data shape (`users/{uid}`)
| Field | Who | Notes |
|---|---|---|
| `role` | all | `patient` (signed up as "Myself") or `caregiver` |
| `name, email, phone, age, gender, address` | all | |
| `conditions` | patient | shown to guardians when sharing is on |
| `guardians` | patient | `[{name, relation, email, phone}]` |
| `guardianEmails` | patient | lowercased emails, used by the rules |
| `shareWithGuardians`, `shareLocation` | patient | sharing switches |
| `lastLocation` | patient | `{lat, lon, place, at}`, saved at most every 10 min, only if both switches are on |
| `careFor` | caregiver | quick-call contacts `[{name, relation, email, phone}]` |

## Community data (`posts/{id}`, `reports/{id}`)
| Field | Notes |
|---|---|
| `type` | `cleanup`, `resources` or `hazard` |
| `title, loc, details` | up to 90 / 80 / 600 characters |
| `authorUid, authorName` | the author; name is shown as first name + last initial |
| `status` | `pending` until an admin approves, then `approved` |
| `createdAt` | milliseconds since 1970 |

Reports store `postId, postTitle, uid, createdAt`. One report per person per post.
