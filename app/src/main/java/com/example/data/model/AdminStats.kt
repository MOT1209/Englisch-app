package com.example.data.model

/** Real, locally-derived admin analytics: counts straight from the Room DB. */
data class AdminStats(
    val languages: Int = 0,
    val lessons: Int = 0,
    val exercises: Int = 0,
    val vocabulary: Int = 0,
    val grammarRules: Int = 0,
    val flashcards: Int = 0,
    val completedLessons: Int = 0
)