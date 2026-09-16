# LinguaVerse — خطة التطوير

الحالة الأساس: تقرير التدقيق `docs/AUDIT.md` + إضافات الباك-إند (Express/Prisma/قائمة مزوّدي AI).

## P0 — إصلاحات سريعة (جاري التنفيذ)

| # | المهمة | الملفات | الحالة |
|---|--------|---------|--------|
| 1 | إصلاح الترميز المكسور في سلاسل الواجهة | `app/src/main/res/values/strings.xml` | ✅ |
| 2 | سد ثغرة `updateProfile` (إسناد جماعي) + معالجة `P2002` | `backend/src/controllers/user.controller.ts`, `validators/user.validator.ts`, `routes/user.routes.ts`, `middleware/errorHandler.ts` | ✅ |
| 3 | حدّ معدّل على مسارات المصادقة | `backend/src/utils/authLimiter.ts`, `routes/auth.routes.ts`, `package.json` | ✅ |
| 4 | هجرة Prisma أساسية + seed قابل للإعادة | `backend/prisma/migrations/*`, `backend/prisma/seed.ts` | ✅ (التحقق مؤجل — لا يوجد `DATABASE_URL`) |
| 5 | استبدال أرقام التحليلات المختلقة بأعداد محلية حقيقية | `AdminPanelScreen.kt`, `AdminViewModel.kt`, `LinguaVerseDao.kt`, `LinguaVerseRepository.kt`, `LinguaVerseApp.kt`, ملفات `strings.xml` الثلاثة | ✅ (مكتوب — التحقق مؤجل لتجميع التطبيق) |
| 6 | إزالة `GEMINI_API_KEY` المهجورة من التطبيق | `.env.example` (جذر — التطبيق)، `.env` | ✅ |
| 7 | فحص قاعدة البيانات في `/health` | `backend/src/index.ts` | ✅ |

**ملاحظات:**
- لا يوجد `backend/.env` إطلاقاً وليس هناك `DATABASE_URL` معروف → تُؤجل فحوصات Prisma المتصلة (validate/seed) إلى توفرها.
- `npm run build` محجوب مؤقتاً بكود P1 قيد الصيانة في `language.controller.ts`/`language.routes.ts` (يتولاها وكيل آخر) — تغييرات P0 فيها نفسها سليمة.

**شروط القبول:** `npm run build` + `prisma validate` + seed مرتين بلا خطأ؛ `gradlew test` و`assembleDebug`.

## P1 — ربط التطبيق بالباك-إند (بعد P0)

1. توحيد المحتوى على الباك-إند: استبدال `SupabaseContentDataSource` بمسارات `/api/languages|lessons|...` ثم إزالة عميل Supabase من التطبيق.
2. مصادقة حقيقية: شاشة تسجيل/دخول (JWT + refresh)، تخزين آمن للتوكن، مزامنة إنجاز الدرس عبر `/me/progress`.
3. جدول صدارة حقيقي من `users.xp` بدل البيانات المحاكاة.
4. واجهات قابلة للاختبار: `interface AiTutor` + `interface ContentRepository` وحقن عبر `AppContainer` لاختبار ViewModels وحدةً.

## P2 — عمق المنتج

- تمرين نطق فعلي بالميكروفون (Gemini audio/STT) بدل "اقرأ بصوت عالٍ".
- خوارزمية SRS للبطاقات (الحقول موجودة في المخطط: `easeFactor/intervalDays/repetitions`). **مكتمل كودياً** — `SrsScheduler` (SM-2) + هجرة Room v3 + أزرار تقييم في `FlashcardsView` + حماية حالة SRS عند المزامنة. التحقق بالبناء محجوب مؤقتاً بكود P1.
- منطق فتح الإنجازات على الخادم (`conditionType/conditionValue`).
- محتوى كافٍ للغات المدعومة (العربية A1 جاهز في الـ seed — توسيعه لغيره).

## P3 — تحصين

- اختبارات backend (Vitest/Jest + supertest) وCI لكل المسارين.
- Firebase App Check بدل `APP_TOKEN` المشترك؛ حصة AI على مخزن مشترك لا في الذاكرة.
- سجلّ طلبات منظم + `/health` شامل.
- إعادة تسمية الحزمة من `com.example` إلى حزمة حقيقية.