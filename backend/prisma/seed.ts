import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Seed for the LinguaVerse API.
 *
 * Idempotent by design: every row is inserted through `upsert` on its natural
 * unique key (or behind a `count` guard for the tables that carry no unique
 * key), so running `npm run db:seed` twice neither fails nor duplicates
 * content. The work runs in a single transaction.
 */

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.$transaction(async (tx) => {
    // ============================================================
    // 1. CEFR Levels (static reference data)
    // ============================================================
    const levelDefs = [
      { code: 'A1', sortOrder: 1, title: 'Beginner', description: 'Can understand and use familiar everyday expressions' },
      { code: 'A2', sortOrder: 2, title: 'Elementary', description: 'Can understand sentences on familiar topics' },
      { code: 'B1', sortOrder: 3, title: 'Intermediate', description: 'Can deal with most travel situations' },
      { code: 'B2', sortOrder: 4, title: 'Upper Intermediate', description: 'Can interact with fluency and spontaneity' },
      { code: 'C1', sortOrder: 5, title: 'Advanced', description: 'Can use language flexibly for social and professional purposes' },
      { code: 'C2', sortOrder: 6, title: 'Mastery', description: 'Can understand virtually everything heard or read' },
    ];

    const levels: Record<string, string> = {}; // code -> id
    for (const def of levelDefs) {
      const row = await tx.cefrLevel.upsert({
        where: { code: def.code },
        update: { title: def.title, description: def.description },
        create: def,
      });
      levels[def.code] = row.id;
    }
    const levelId = (code: string) => levels[code]!;
    console.log('✅ CEFR levels seeded');

    // ============================================================
    // 2. Languages
    // ============================================================
    const languageDefs = [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'RTL', flagEmoji: '🇸🇦', totalLevels: 6 },
      { code: 'en', name: 'English', nativeName: 'English', direction: 'LTR', flagEmoji: '🇬🇧', totalLevels: 6 },
      { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'LTR', flagEmoji: '🇪🇸', totalLevels: 6 },
    ];

    const languages: Record<string, string> = {}; // code -> id
    for (const def of languageDefs) {
      const row = await tx.language.upsert({
        where: { code: def.code },
        update: {
          name: def.name,
          nativeName: def.nativeName,
          direction: def.direction,
          flagEmoji: def.flagEmoji,
          totalLevels: def.totalLevels,
        },
        create: { ...def },
      });
      languages[def.code] = row.id;
    }
    const languageId = (code: string) => languages[code]!;
    console.log('✅ Languages seeded: Arabic, English, Spanish');

    // ============================================================
    // 3. Units for Arabic A1
    // ============================================================
    const arA1U1 = await tx.unit.upsert({
      where: { languageId_levelId_code: { languageId: languageId('ar'), levelId: levelId('A1'), code: 'U1' } },
      update: { title: 'Basic Greetings', description: 'Learn essential Arabic greetings and introductions', sortOrder: 1 },
      create: { languageId: languageId('ar'), levelId: levelId('A1'), code: 'U1', title: 'Basic Greetings', description: 'Learn essential Arabic greetings and introductions', sortOrder: 1 },
    });

    const arA1U2 = await tx.unit.upsert({
      where: { languageId_levelId_code: { languageId: languageId('ar'), levelId: levelId('A1'), code: 'U2' } },
      update: { title: 'Numbers & Counting', description: 'Learn Arabic numbers from 1 to 100', sortOrder: 2 },
      create: { languageId: languageId('ar'), levelId: levelId('A1'), code: 'U2', title: 'Numbers & Counting', description: 'Learn Arabic numbers from 1 to 100', sortOrder: 2 },
    });

    // ============================================================
    // 4. Lessons for Arabic A1 Unit 1
    // ============================================================
    const lesson1 = await tx.lesson.upsert({
      where: { unitId_orderIndex: { unitId: arA1U1.id, orderIndex: 1 } },
      update: { title: 'Hello & Goodbye', category: 'Greetings', xpReward: 20, isPublished: true, tags: ['greetings', 'basics'] },
      create: {
        languageId: languageId('ar'),
        levelId: levelId('A1'),
        unitId: arA1U1.id,
        title: 'Hello & Goodbye',
        description: 'Common Arabic greetings',
        category: 'Greetings',
        xpReward: 20,
        orderIndex: 1,
        isPublished: true,
        tags: ['greetings', 'basics'],
      },
    });

    const lesson2 = await tx.lesson.upsert({
      where: { unitId_orderIndex: { unitId: arA1U1.id, orderIndex: 2 } },
      update: { title: 'Introducing Yourself', category: 'Greetings', xpReward: 25, isPublished: true, tags: ['introduction', 'basics'] },
      create: {
        languageId: languageId('ar'),
        levelId: levelId('A1'),
        unitId: arA1U1.id,
        title: 'Introducing Yourself',
        description: 'How to say your name and ask others',
        category: 'Greetings',
        xpReward: 25,
        orderIndex: 2,
        isPublished: true,
        tags: ['introduction', 'basics'],
      },
    });

    // ============================================================
    // 5-6. Exercises (keyed on lessonId + sortOrder)
    // ============================================================
    const exercises = [
      // Lesson 1
      { lessonId: lesson1.id, type: 'vocabulary' as const, prompt: 'What does "مرحبا" mean?', targetText: 'مرحبا', correctAnswer: 'Hello', optionsJson: ['Hello', 'Goodbye', 'Thank you', 'Please'], explanation: 'مرحبا (marhaba) means "Hello" in Arabic', sortOrder: 1, xpReward: 10 },
      { lessonId: lesson1.id, type: 'vocabulary' as const, prompt: 'How do you say "Goodbye" in Arabic?', targetText: 'مع السلامة', correctAnswer: 'مع السلامة', optionsJson: ['مرحبا', 'مع السلامة', 'شكرا', 'من فضلك'], explanation: 'مع السلامة (ma\'a as-salama) means "Goodbye"', sortOrder: 2, xpReward: 10 },
      { lessonId: lesson1.id, type: 'listening' as const, prompt: 'Listen and select the correct greeting', audioUrl: '', correctAnswer: 'السلام عليكم', optionsJson: ['مرحبا', 'السلام عليكم', 'صباح الخير', 'مساء الخير'], explanation: 'السلام عليكم is the formal Islamic greeting', sortOrder: 3, xpReward: 15 },
      { lessonId: lesson1.id, type: 'writing' as const, prompt: 'Write "Good morning" in Arabic', correctAnswer: 'صباح الخير', explanation: 'صباح الخير (sabah al-khayr) = Good morning', sortOrder: 4, xpReward: 15 },
      // Lesson 2
      { lessonId: lesson2.id, type: 'vocabulary' as const, prompt: 'How do you say "My name is..." in Arabic?', targetText: 'اسمي', correctAnswer: 'اسمي', optionsJson: ['اسمي', 'أنا', 'هل', 'كيف'], explanation: 'اسمي (ismi) = My name is', sortOrder: 1, xpReward: 10 },
      { lessonId: lesson2.id, type: 'conversation' as const, prompt: 'Complete the dialogue:\nA: ما اسمك؟ (What is your name?)\nB: ______', correctAnswer: 'اسمي أحمد', explanation: 'اسمي + your name = My name is...', sortOrder: 2, xpReward: 20 },
    ];

    for (const ex of exercises) {
      const { lessonId: lessonIdRef, sortOrder, ...data } = ex;
      await tx.exercise.upsert({
        where: { lessonId_sortOrder: { lessonId: lessonIdRef, sortOrder } },
        update: { ...data, optionsJson: data.optionsJson as never, isPublished: true },
        create: { ...data, lessonId: lessonIdRef, sortOrder, optionsJson: data.optionsJson as never, isPublished: true },
      });
    }

    // ============================================================
    // 7. Vocabulary for Arabic
    // ============================================================
    const vocabularies = [
      { word: 'مرحبا', translation: 'Hello', phonetic: 'marhaba', category: 'Greetings', exampleSentence: 'مرحبا، كيف حالك؟', exampleTranslation: 'Hello, how are you?' },
      { word: 'شكرا', translation: 'Thank you', phonetic: 'shukran', category: 'Courtesy', exampleSentence: 'شكرا جزيلا', exampleTranslation: 'Thank you very much' },
      { word: 'من فضلك', translation: 'Please', phonetic: 'min fadlak', category: 'Courtesy', exampleSentence: 'من فضلك، افتح الباب', exampleTranslation: 'Please, open the door' },
      { word: 'نعم', translation: 'Yes', phonetic: 'na\'am', category: 'Basics', exampleSentence: 'نعم، أنا جاهز', exampleTranslation: 'Yes, I am ready' },
      { word: 'لا', translation: 'No', phonetic: 'la', category: 'Basics', exampleSentence: 'لا، شكرا', exampleTranslation: 'No, thank you' },
      { word: 'صباح الخير', translation: 'Good morning', phonetic: 'sabah al-khayr', category: 'Greetings', exampleSentence: 'صباح الخير يا أستاذ', exampleTranslation: 'Good morning, teacher' },
      { word: 'مساء الخير', translation: 'Good evening', phonetic: 'masa al-khayr', category: 'Greetings', exampleSentence: 'مساء الخير، كيف حالك؟', exampleTranslation: 'Good evening, how are you?' },
      { word: 'مع السلامة', translation: 'Goodbye', phonetic: 'ma\'a as-salama', category: 'Greetings', exampleSentence: 'مع السلامة، إلى اللقاء', exampleTranslation: 'Goodbye, see you later' },
    ];

    for (const v of vocabularies) {
      await tx.vocabulary.upsert({
        where: { languageId_word: { languageId: languageId('ar'), word: v.word } },
        update: v,
        create: { languageId: languageId('ar'), ...v },
      });
    }

    // ============================================================
    // 8. Flashcards for Arabic
    // ============================================================
    const flashcards = [
      { frontWord: 'مرحبا', backTranslation: 'Hello', phonetic: 'marhaba', exampleSentence: 'مرحبا بك في منزلي' },
      { frontWord: 'شكرا', backTranslation: 'Thank you', phonetic: 'shukran', exampleSentence: 'شكرا على مساعدتك' },
      { frontWord: 'من فضلك', backTranslation: 'Please', phonetic: 'min fadlak', exampleSentence: 'هل يمكنك مساعدتي من فضلك؟' },
    ];

    for (const f of flashcards) {
      await tx.flashcard.upsert({
        where: { languageId_frontWord: { languageId: languageId('ar'), frontWord: f.frontWord } },
        update: f,
        create: { languageId: languageId('ar'), ...f },
      });
    }

    // ============================================================
    // 9. Grammar Rules for Arabic A1
    // ============================================================
    const grammarRules = [
      { title: 'Definite Article ال (Al)', summary: 'Arabic uses the prefix ال (al-) to make nouns definite', fullRuleText: 'In Arabic, the definite article is ال (al-). It is attached to the beginning of nouns. Example: كتاب (kitab) = a book → الكتاب (al-kitab) = the book.', exampleSentence: 'الكتاب جميل', exampleTranslation: 'The book is beautiful', category: 'Grammar Basics' },
      { title: 'Personal Pronouns', summary: 'Arabic personal pronouns for subjects', fullRuleText: 'Arabic pronouns: أنا (ana) = I, أنت (anta) = you (m), أنتِ (anti) = you (f), هو (huwa) = he, هي (hiya) = she, نحن (nahnu) = we, أنتم (antum) = you (pl m), هم (hum) = they.', exampleSentence: 'أنا أدرس العربية', exampleTranslation: 'I study Arabic', category: 'Pronouns' },
    ];

    for (const g of grammarRules) {
      await tx.grammarRule.upsert({
        where: { languageId_title: { languageId: languageId('ar'), title: g.title } },
        update: g,
        create: { languageId: languageId('ar'), levelId: levelId('A1'), ...g },
      });
    }

    // ============================================================
    // 10. Units / Lessons for English and Spanish A1
    // ============================================================
    const enA1U1 = await tx.unit.upsert({
      where: { languageId_levelId_code: { languageId: languageId('en'), levelId: levelId('A1'), code: 'U1' } },
      update: { title: 'Introduction to English', description: 'Basic English greetings and introductions', sortOrder: 1 },
      create: { languageId: languageId('en'), levelId: levelId('A1'), code: 'U1', title: 'Introduction to English', description: 'Basic English greetings and introductions', sortOrder: 1 },
    });

    const enLesson1 = await tx.lesson.upsert({
      where: { unitId_orderIndex: { unitId: enA1U1.id, orderIndex: 1 } },
      update: { title: 'Greetings in English', category: 'Greetings', xpReward: 20, isPublished: true, tags: ['greetings', 'basics'] },
      create: {
        languageId: languageId('en'),
        levelId: levelId('A1'),
        unitId: enA1U1.id,
        title: 'Greetings in English',
        description: 'Common English greetings',
        category: 'Greetings',
        xpReward: 20,
        orderIndex: 1,
        isPublished: true,
        tags: ['greetings', 'basics'],
      },
    });

    await tx.exercise.upsert({
      where: { lessonId_sortOrder: { lessonId: enLesson1.id, sortOrder: 1 } },
      update: { prompt: 'What does "Hello" mean?', targetText: 'Hello', correctAnswer: 'مرحبا', optionsJson: ['مرحبا', 'وداعا', 'شكرا', 'من فضلك'], explanation: 'Hello is the most common English greeting', isPublished: true },
      create: { lessonId: enLesson1.id, type: 'vocabulary', prompt: 'What does "Hello" mean?', targetText: 'Hello', correctAnswer: 'مرحبا', optionsJson: ['مرحبا', 'وداعا', 'شكرا', 'من فضلك'], explanation: 'Hello is the most common English greeting', sortOrder: 1, xpReward: 10, isPublished: true },
    });

    const esA1U1 = await tx.unit.upsert({
      where: { languageId_levelId_code: { languageId: languageId('es'), levelId: levelId('A1'), code: 'U1' } },
      update: { title: 'Hola, Español', description: 'Basic Spanish greetings', sortOrder: 1 },
      create: { languageId: languageId('es'), levelId: levelId('A1'), code: 'U1', title: 'Hola, Español', description: 'Basic Spanish greetings', sortOrder: 1 },
    });

    const esLesson1 = await tx.lesson.upsert({
      where: { unitId_orderIndex: { unitId: esA1U1.id, orderIndex: 1 } },
      update: { title: 'Saludos', category: 'Greetings', xpReward: 20, isPublished: true, tags: ['greetings', 'basics'] },
      create: {
        languageId: languageId('es'),
        levelId: levelId('A1'),
        unitId: esA1U1.id,
        title: 'Saludos',
        description: 'Common Spanish greetings',
        category: 'Greetings',
        xpReward: 20,
        orderIndex: 1,
        isPublished: true,
        tags: ['greetings', 'basics'],
      },
    });

    await tx.exercise.upsert({
      where: { lessonId_sortOrder: { lessonId: esLesson1.id, sortOrder: 1 } },
      update: { prompt: 'What does "Hola" mean?', targetText: 'Hola', correctAnswer: 'Hello', optionsJson: ['Hello', 'Goodbye', 'Thank you', 'Please'], explanation: 'Hola is the most common Spanish greeting', isPublished: true },
      create: { lessonId: esLesson1.id, type: 'vocabulary', prompt: 'What does "Hola" mean?', targetText: 'Hola', correctAnswer: 'Hello', optionsJson: ['Hello', 'Goodbye', 'Thank you', 'Please'], explanation: 'Hola is the most common Spanish greeting', sortOrder: 1, xpReward: 10, isPublished: true },
    });

    // ============================================================
    // 11. Achievements (no natural unique key → guard by count)
    // ============================================================
    const achievementCount = await tx.achievement.count();
    if (achievementCount === 0) {
      await tx.achievement.createMany({
        data: [
          { title: 'First Steps', description: 'Complete your first lesson', iconName: 'star', rewardXp: 50, conditionType: 'lessons_completed', conditionValue: 1 },
          { title: 'Word Collector', description: 'Learn 10 vocabulary words', iconName: 'book', rewardXp: 100, conditionType: 'words_learned', conditionValue: 10 },
          { title: 'Streak Master', description: 'Maintain a 7-day streak', iconName: 'flame', rewardXp: 200, conditionType: 'streak', conditionValue: 7 },
          { title: 'Century Club', description: 'Earn 100 XP', iconName: 'trophy', rewardXp: 50, conditionType: 'xp_total', conditionValue: 100 },
          { title: 'Polyglot', description: 'Start learning 3 languages', iconName: 'globe', rewardXp: 300, conditionType: 'languages_started', conditionValue: 3 },
        ],
      });
    }
    console.log('✅ Achievements seeded');

    // ============================================================
    // 12. Demo User
    // ============================================================
    const passwordHash = await bcrypt.hash('demo1234', 12);
    await tx.user.upsert({
      where: { username: 'demo' },
      update: {},
      create: {
        username: 'demo',
        email: 'demo@linguaverse.com',
        passwordHash,
        xp: 450,
        coins: 120,
        streakCount: 5,
        dailyGoalXp: 50,
        todayXp: 30,
      },
    });
    console.log('✅ Demo user seeded (username: demo, password: demo1234)');
  });

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });