package com.example.domain

import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Simplified SM-2 scheduler for flashcard reviews with a three-button UX
 * (Again / Good / Easy). Mirrors the SRS columns stored in Room and the backend
 * Prisma schema: `easeFactor`, `repetitions`, `intervalDays`, `nextReviewAt`.
 *
 * Pure Kotlin — no Android dependencies — so the whole algorithm is covered by
 * JVM unit tests.
 */
enum class ReviewGrade { AGAIN, GOOD, EASY }

data class SrsResult(
    val intervalDays: Int,
    val easeFactor: Double,
    val repetitions: Int,
    val nextReviewAt: Long,
    val isMastered: Boolean
)

object SrsScheduler {

    const val DEFAULT_EASE_FACTOR = 2.5
    const val MASTERED_INTERVAL_DAYS = 30
    private const val MIN_EASE_FACTOR = 1.3
    private const val DAY_MS = 24L * 60 * 60 * 1000

    /** SM-2 interval progression: 1, 6, then interval × ease (Easy grows faster). */
    fun nextIntervalDays(
        grade: ReviewGrade,
        currentIntervalDays: Int,
        easeFactor: Double,
        repetitions: Int
    ): Int = when (grade) {
        ReviewGrade.AGAIN -> 1
        ReviewGrade.GOOD -> when {
            repetitions < 1 -> 1
            repetitions == 1 -> 6
            else -> (currentIntervalDays * easeFactor).roundToInt()
        }
        ReviewGrade.EASY -> when {
            repetitions < 1 -> 4
            repetitions == 1 -> 10
            else -> (currentIntervalDays * easeFactor * 1.3).roundToInt()
        }
    }

    /**
     * SM-2 ease factor update, mapping the three buttons to quality 2/4/5:
     * AGAIN lowers it, GOOD leaves it unchanged, EASY raises it. Never drops
     * below [MIN_EASE_FACTOR], the floor used by Anki.
     */
    fun nextEaseFactor(grade: ReviewGrade, easeFactor: Double): Double {
        val quality = when (grade) {
            ReviewGrade.AGAIN -> 2
            ReviewGrade.GOOD -> 4
            ReviewGrade.EASY -> 5
        }
        val delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        return max(MIN_EASE_FACTOR, easeFactor + delta)
    }

    /**
     * Grades a review and returns the full updated SRS state to persist.
     *
     * @param repetitions repetitions *before* this review (0 for a new card).
     */
    fun grade(
        grade: ReviewGrade,
        easeFactor: Double = DEFAULT_EASE_FACTOR,
        repetitions: Int = 0,
        intervalDays: Int = 1,
        now: Long = System.currentTimeMillis()
    ): SrsResult {
        val lapsed = grade == ReviewGrade.AGAIN
        val nextRepetitions = if (lapsed) 0 else repetitions + 1
        val nextInterval = nextIntervalDays(grade, intervalDays, easeFactor, repetitions)
        return SrsResult(
            intervalDays = nextInterval,
            easeFactor = nextEaseFactor(grade, easeFactor),
            repetitions = nextRepetitions,
            nextReviewAt = now + nextInterval * DAY_MS,
            isMastered = !lapsed && nextInterval >= MASTERED_INTERVAL_DAYS
        )
    }

    fun isDue(nextReviewAt: Long, now: Long = System.currentTimeMillis()): Boolean =
        nextReviewAt <= now
}