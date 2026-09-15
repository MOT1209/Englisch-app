# LinguaVerse

تطبيق أندرويد لتعلّم اللغات: دروس تفاعلية، مفردات، قواعد، بطاقات، ومعلّم ذكي مبني على Gemini.

مبني بـ Kotlin و Jetpack Compose و Room.

---

## التشغيل محليًا

**المتطلبات:** [Android Studio](https://developer.android.com/studio) و JDK 17+.

```bash
git clone https://github.com/MOT1209/Englisch-app.git
cd Englisch-app
./gradlew assembleDebug
```

### تفعيل المعلّم الذكي (AI Tutor)

> ⚠️ مفتاح Gemini لا يُحزن داخل التطبيق بعد الآن. بدلاً من ذلك، يتم إرسال الطلبات إلى **دالة Firebase السحابية (Cloud Function)** التي تحتفظ بالمفتاح في الخلفية.

#### الطريقة السريعة: استخدام مشروع Firebase الخاص بك

1. أنشئ مشروع Firebase في [وحدة تحكم Firebase](https://console.firebase.google.com/)
2. فعّل **Cloud Functions** و **App Check** (لحماية الـ function من إساءة الاستخدام)
3. انشر الدالة:

```bash
# في مجلد المشروع
firebase deploy --only functions
```

4. بعد النشر، ستحصل على رابط مثل:
   `https://us-central1-project-id.cloudfunctions.net/proxyGemini`

5. استبدل الرابط في `GeminiTutorService.kt`:
   ```kotlin
   private const val PROXY_URL = "https://us-central1-project-id.cloudfunctions.net/proxyGemini"
   ```

6. اضبط مفتاح Gemini في البيئة الخاصة بالدوال:
   ```bash
   firebase functions:config set gemini.key="YOUR_GEMINI_API_KEY"
   firebase deploy --only functions
   ```

#### للاختبار المحلي (Local Emulator)

```bash
# شغّل محاكي الدوال
cd functions
npm install
firebase emulators:start --only functions
```

ثم غيّر `PROXY_URL` في `GeminiTutorService.kt` إلى:
```
http://10.0.2.2:5001/project-id/us-central1/proxyGemini
```

> ملحوظة: `10.0.2.2` هو IP الخاص بـ localhost في محاكي أندرويد.

---

## البناء والاختبار

```bash
./gradlew assembleDebug        # بناء APK للتطوير
./gradlew testDebugUnitTest    # اختبارات الوحدة
```

> **ملاحظة على أجهزة بلغة غير إنجليزية:** يثبّت `gradle.properties` لغة الـJVM على `en-US`، بما فيها فئة `format`. هذا ضروري: مولّد Room يستعمل `String.format` التي تقرأ فئة `FORMAT` من إعداد التنسيق الإقليمي للنظام، فيكتب على جهاز عربي أرقامًا هندية عربية داخل شيفرة Kotlin المولّدة (`RoomOpenDelegate(١, ...)`) ويفشل التصريح. لا تحذف هذه الإعدادات.

---

## البنية

```
app/src/main/java/com/example/
├── ai/          خدمة Gemini ونتائجها الصريحة (AiOutcome)
├── audio/       نطق النصوص (TTS)
├── data/
│   ├── db/      Room: قاعدة البيانات والهجرات و DAO
│   ├── model/   الكيانات والمحوّلات
│   ├── prefs/   تفضيلات المستخدم (DataStore)
│   └── repository/
├── domain/      منطق نقي قابل للاختبار (تصحيح الإجابات)
└── ui/          Compose: التنقّل والشاشات والمكوّنات والثيم
```

قاعدة البيانات تُصدّر مخطّطها إلى `app/schemas/`. أي تعديل على المخطّط يجب أن يرافقه `Migration` في `AppDatabase.kt` — لا يوجد `fallbackToDestructiveMigration`، لأنها كانت تمحو بيانات المستخدمين.

---

## الأمن

- مفتاح Gemini يُحزم في خادم وسيط (Firebase Cloud Function)، ثم يُرسل الستجيب إلى التطبيق.
- `metadata.json` ينادي `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` — أي أن الاستدعاء يتم من الخلفية.

---

## حالة المشروع

هذا المشروع خضع لتدقيق شامل موثّق في **[`docs/AUDIT.md`](docs/AUDIT.md)**.

### المنجز
- ✅ مرحلة 0–5 (إصلاحات البناء، حماية البيانات، التنقل، التخزين، صحة الـ AI)

### قيد المعالجة
- ⬜ مرحلة 6 — حقن الاعتماديات وتفكيك الـViewModel
- ⬜ مرحلة 7 — تحسينات الثيم والتدويل وحماية لوحة الإدارة
- ⬜ مرحلة 8 — تنظيف الاعتماديات وتفعيل ProGuard والتصغير
