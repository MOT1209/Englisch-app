package com.example.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.get
import com.example.data.model.SkillType
import com.example.data.model.UserProfile
import com.example.ui.screens.*
import com.example.ui.viewmodel.AiChatViewModel
import com.example.ui.viewmodel.AdminViewModel
import com.example.ui.viewmodel.HomeViewModel
import com.example.ui.viewmodel.LessonViewModel
import com.example.ui.viewmodel.MainViewModel
import com.example.ui.viewmodel.ProfileViewModel
import com.example.ui.viewmodel.SkillsViewModel

/** Destinations shown in the bottom navigation bar. */
enum class MainDestination(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    HOME("home", "Home", Icons.Filled.Home, Icons.Outlined.Home),
    SKILLS("skills", "Skill Hub", Icons.Filled.GridView, Icons.Outlined.GridView),
    AI_CHAT("ai_chat", "AI Tutor", Icons.Filled.SmartToy, Icons.Outlined.SmartToy),
    LEADERBOARD("leaderboard", "Leagues", Icons.Filled.EmojiEvents, Icons.Outlined.EmojiEvents),
    PROFILE("profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person),
    SETTINGS("settings", "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
}

/** Full-screen destinations pushed on top of the bottom-bar destinations. */
private object Routes {
    const val SKILL_DETAIL = "skill_detail/{skillType}"
    const val LESSON = "lesson/{lessonId}"
    const val ADMIN = "admin"

    fun skillDetail(skill: SkillType) = "skill_detail/${skill.name}"
    fun lesson(lessonId: String) = "lesson/$lessonId"
}

@Composable
fun LinguaVerseApp(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    mainViewModel: MainViewModel = hiltViewModel()
) {
    val userProfile by mainViewModel.userProfile.collectAsStateWithLifecycle()
    val languages by mainViewModel.languages.collectAsStateWithLifecycle()
    val audioSpeed by mainViewModel.audioSpeed.collectAsStateWithLifecycle()

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination
    val showBottomBar = MainDestination.entries.any { destination ->
        currentRoute?.hierarchy?.any { it.route == destination.route } == true
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    modifier = Modifier
                        .windowInsetsPadding(WindowInsets.navigationBars)
                        .testTag("main_navigation_bar")
                ) {
                    MainDestination.entries.forEach { destination ->
                        val isSelected =
                            currentRoute?.hierarchy?.any { it.route == destination.route } == true
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { navController.navigateToTab(destination) },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) {
                                        destination.selectedIcon
                                    } else {
                                        destination.unselectedIcon
                                    },
                                    contentDescription = destination.title
                                )
                            },
                            label = {
                                Text(
                                    text = destination.title,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MainDestination.HOME.route,
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            composable(MainDestination.HOME.route) { backStackEntry ->
                val homeViewModel: HomeViewModel = hiltViewModel(backStackEntry)
                val homeProfile by homeViewModel.userProfile.collectAsStateWithLifecycle()
                val homeLanguages by homeViewModel.languages.collectAsStateWithLifecycle()
                val homeLessons by homeViewModel.currentLessons.collectAsStateWithLifecycle()
                val homeAchievements by homeViewModel.achievements.collectAsStateWithLifecycle()

                HomeScreen(
                    userProfile = homeProfile,
                    languages = homeLanguages,
                    lessons = homeLessons,
                    achievements = homeAchievements,
                    onSelectLanguage = { homeViewModel.setTargetLanguage(it) },
                    onStartLesson = { lesson -> navController.navigate(Routes.lesson(lesson.id)) },
                    onNavigateToSkills = { navController.navigateToTab(MainDestination.SKILLS) },
                    onNavigateToAiChat = { navController.navigateToTab(MainDestination.AI_CHAT) }
                )
            }

            composable(MainDestination.SKILLS.route) { backStackEntry ->
                SkillsHubScreen(
                    onSelectSkill = { skill ->
                        if (skill == SkillType.AI_CHAT) {
                            navController.navigateToTab(MainDestination.AI_CHAT)
                        } else {
                            navController.navigate(Routes.skillDetail(skill))
                        }
                    }
                )
            }

            composable(MainDestination.AI_CHAT.route) { backStackEntry ->
                val aiChatViewModel: AiChatViewModel = hiltViewModel(backStackEntry)
                val chatMessages by aiChatViewModel.chatMessages.collectAsStateWithLifecycle()
                val isAiChatLoading by aiChatViewModel.isAiChatLoading.collectAsStateWithLifecycle()
                val aiChatError by aiChatViewModel.aiChatError.collectAsStateWithLifecycle()
                val chatLevel by aiChatViewModel.currentLevel.collectAsStateWithLifecycle()

                AiChatScreen(
                    messages = chatMessages,
                    isLoading = isAiChatLoading,
                    error = aiChatError,
                    currentLevel = chatLevel,
                    onSendMessage = { aiChatViewModel.sendAiChatMessage(it) },
                    onSpeakText = { mainViewModel.speakText(it) },
                    onBack = { navController.navigateToTab(MainDestination.HOME) }
                )
            }

            composable(MainDestination.LEADERBOARD.route) {
                LeaderboardScreen(
                    currentUsername = userProfile.username,
                    currentUserXp = userProfile.xp
                )
            }

            composable(MainDestination.PROFILE.route) { backStackEntry ->
                val profileViewModel: ProfileViewModel = hiltViewModel(backStackEntry)
                val profileUser by profileViewModel.userProfile.collectAsStateWithLifecycle()
                val profileAchievements by profileViewModel.achievements.collectAsStateWithLifecycle()

                ProfileScreen(
                    userProfile = profileUser ?: UserProfile(),
                    achievements = profileAchievements
                )
            }

            composable(MainDestination.SETTINGS.route) {
                SettingsScreen(
                    isDarkTheme = mainViewModel.isDarkTheme.collectAsStateWithLifecycle().value,
                    audioSpeed = audioSpeed,
                    languages = languages,
                    targetLanguageCode = userProfile.targetLanguageCode,
                    onToggleDarkTheme = { mainViewModel.toggleDarkTheme() },
                    onSetAudioSpeed = { mainViewModel.setAudioSpeed(it) },
                    onSelectLanguage = { mainViewModel.setTargetLanguage(it) },
                    onOpenAdminPanel = { navController.navigate(Routes.ADMIN) }
                )
            }

            composable(Routes.SKILL_DETAIL) { entry ->
                val skillType = entry.arguments
                    ?.getString("skillType")
                    ?.let { name -> SkillType.entries.firstOrNull { it.name == name } }

                if (skillType == null) {
                    LaunchedEffect(Unit) { navController.popBackStack() }
                } else {
                    val skillsViewModel: SkillsViewModel = hiltViewModel(entry)
                    val aiChatViewModel: AiChatViewModel = hiltViewModel(entry)
                    val skillVocabularies by skillsViewModel.vocabularies.collectAsStateWithLifecycle()
                    val skillGrammarRules by skillsViewModel.grammarRules.collectAsStateWithLifecycle()
                    val skillFlashcards by skillsViewModel.flashcards.collectAsStateWithLifecycle()
                    val skillTargetLang by skillsViewModel.targetLanguageCode.collectAsStateWithLifecycle()
                    val writingEvaluation by aiChatViewModel.writingEvaluation.collectAsStateWithLifecycle()
                    val writingEvaluationError by aiChatViewModel.writingEvaluationError.collectAsStateWithLifecycle()
                    val isEvaluatingWriting by aiChatViewModel.isEvaluatingWriting.collectAsStateWithLifecycle()

                    SkillDetailScreen(
                        skillType = skillType,
                        targetLanguageCode = skillTargetLang,
                        vocabularies = skillVocabularies,
                        grammarRules = skillGrammarRules,
                        flashcards = skillFlashcards,
                        writingEvaluation = writingEvaluation,
                        writingEvaluationError = writingEvaluationError,
                        isEvaluatingWriting = isEvaluatingWriting,
                        audioSpeed = audioSpeed,
                        onSpeakText = { mainViewModel.speakText(it) },
                        onSetAudioSpeed = { mainViewModel.setAudioSpeed(it) },
                        onEvaluateWriting = { text, prompt ->
                            aiChatViewModel.evaluateWritingSubmission(text, prompt)
                        },
                        onToggleFavoriteVocab = { vocab -> skillsViewModel.toggleFavoriteVocab(vocab) },
                        onBack = { navController.popBackStack() }
                    )
                }
            }

            composable(Routes.LESSON) { entry ->
                val lessonId = entry.arguments?.getString("lessonId").orEmpty()

                val lessonViewModel: LessonViewModel = hiltViewModel(entry)
                val activeLesson by lessonViewModel.activeLesson.collectAsStateWithLifecycle()
                val activeExercises by lessonViewModel.activeExercises.collectAsStateWithLifecycle()
                val currentExerciseIndex by lessonViewModel.currentExerciseIndex.collectAsStateWithLifecycle()
                val lessonCompleted by lessonViewModel.lessonCompleted.collectAsStateWithLifecycle()

                val lesson = activeLesson
                if (lesson == null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else {
                    val exitLesson = {
                        lessonViewModel.closeLesson()
                        navController.popBackStack()
                        Unit
                    }
                    LessonScreen(
                        lesson = lesson,
                        exercises = activeExercises,
                        currentIndex = currentExerciseIndex,
                        isCompleted = lessonCompleted,
                        audioSpeed = audioSpeed,
                        onSpeakText = { mainViewModel.speakText(it) },
                        onSetAudioSpeed = { mainViewModel.setAudioSpeed(it) },
                        onSubmitAnswer = { lessonViewModel.submitExerciseAnswer(it) },
                        onNextExercise = { lessonViewModel.nextExercise() },
                        onCloseLesson = exitLesson
                    )
                }
            }

            composable(Routes.ADMIN) { backStackEntry ->
                val adminViewModel: AdminViewModel = hiltViewModel(backStackEntry)
                val adminTargetLang by adminViewModel.targetLanguageCode.collectAsStateWithLifecycle()

                AdminPanelScreen(
                    targetLanguageCode = adminTargetLang,
                    onAddLanguage = { code, name, nativeName, flag, desc ->
                        adminViewModel.addNewLanguage(code, name, nativeName, flag, desc)
                    },
                    onAddLesson = { title, cat, level, xp, prompt, ans ->
                        adminViewModel.addNewLesson(title, cat, level, xp, prompt, ans, adminTargetLang)
                    },
                    onAddVocabulary = { word, trans, ex, cat ->
                        adminViewModel.addNewVocabulary(word, trans, ex, cat, adminTargetLang)
                    },
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

/**
 * Standard bottom-bar behaviour: one entry per tab on the back stack, state kept
 * per tab, and system back returning to the start destination.
 */
private fun NavHostController.navigateToTab(destination: MainDestination) {
    navigate(destination.route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

