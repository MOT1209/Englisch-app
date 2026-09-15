package com.example.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SrsSchedulerTest {

    private val now = 1_700_000_000_000L
    private val day = 24L * 60 * 60 * 1000

    @Test
    fun `first GOOD review schedules one day out`() {
        val result = SrsScheduler.grade(ReviewGrade.GOOD, now = now)
        assertEquals(1, result.intervalDays)
        assertEquals(1, result.repetitions)
        assertEquals(now + day, result.nextReviewAt)
    }

    @Test
    fun `second GOOD review schedules six days out`() {
        val result = SrsScheduler.grade(ReviewGrade.GOOD, repetitions = 1, intervalDays = 1, now = now)
        assertEquals(6, result.intervalDays)
        assertEquals(2, result.repetitions)
    }

    @Test
    fun `third GOOD review multiplies interval by ease factor`() {
        val result = SrsScheduler.grade(
            ReviewGrade.GOOD,
            easeFactor = 2.5,
            repetitions = 2,
            intervalDays = 6,
            now = now
        )
        assertEquals(15, result.intervalDays) // 6 * 2.5
        assertEquals(3, result.repetitions)
    }

    @Test
    fun `AGAIN resets repetitions and interval regardless of progress`() {
        val result = SrsScheduler.grade(
            ReviewGrade.AGAIN,
            easeFactor = 2.5,
            repetitions = 4,
            intervalDays = 40,
            now = now
        )
        assertEquals(0, result.repetitions)
        assertEquals(1, result.intervalDays)
        assertEquals(now + day, result.nextReviewAt)
        assertFalse(result.isMastered)
    }

    @Test
    fun `AGAIN lowers the ease factor`() {
        val result = SrsScheduler.grade(ReviewGrade.AGAIN, easeFactor = 2.5, now = now)
        assertTrue(result.easeFactor < 2.5)
    }

    @Test
    fun `GOOD keeps the ease factor unchanged`() {
        val result = SrsScheduler.grade(ReviewGrade.GOOD, easeFactor = 2.5, now = now)
        assertEquals(2.5, result.easeFactor, 0.0001)
    }

    @Test
    fun `EASY raises the ease factor`() {
        val result = SrsScheduler.grade(ReviewGrade.EASY, easeFactor = 2.5, now = now)
        assertTrue(result.easeFactor > 2.5)
    }

    @Test
    fun `ease factor never drops below the floor`() {
        var result = SrsScheduler.grade(ReviewGrade.AGAIN, easeFactor = 1.3, now = now)
        assertEquals(1.3, result.easeFactor, 0.0001)
        repeat(10) {
            result = SrsScheduler.grade(ReviewGrade.AGAIN, easeFactor = result.easeFactor, now = now)
        }
        assertEquals(1.3, result.easeFactor, 0.0001)
    }

    @Test
    fun `first EASY review schedules four days out`() {
        val result = SrsScheduler.grade(ReviewGrade.EASY, now = now)
        assertEquals(4, result.intervalDays)
        assertEquals(now + 4 * day, result.nextReviewAt)
    }

    @Test
    fun `card with thirty day interval becomes mastered`() {
        val result = SrsScheduler.grade(
            ReviewGrade.GOOD,
            easeFactor = 2.5,
            repetitions = 5,
            intervalDays = 30,
            now = now
        )
        assertTrue(result.isMastered)
    }

    @Test
    fun `isDue on brand new card defaults to due`() {
        assertTrue(SrsScheduler.isDue(0, now = now))
        assertFalse(SrsScheduler.isDue(now + day, now = now))
    }
}