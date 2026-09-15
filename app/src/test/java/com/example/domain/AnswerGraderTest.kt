package com.example.domain

import com.example.data.model.Exercise
import com.example.data.model.ExerciseType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AnswerGraderTest {

    private fun exercise(
        type: ExerciseType = ExerciseType.VOCABULARY,
        correctAnswer: String = "",
        targetText: String = "",
        optionsJson: String = "[]",
        explanation: String = ""
    ) = Exercise(
        id = "ex",
        lessonId = "les",
        type = type,
        prompt = "prompt",
        targetText = targetText,
        correctAnswer = correctAnswer,
        optionsJson = optionsJson,
        explanation = explanation
    )

    @Test
    fun `exact answer is correct`() {
        val ex = exercise(correctAnswer = "La cuenta, por favor.")
        assertTrue(AnswerGrader.isCorrect(ex, "La cuenta, por favor."))
    }

    @Test
    fun `answer is case and whitespace insensitive`() {
        val ex = exercise(correctAnswer = "La cuenta, por favor.")
        assertTrue(AnswerGrader.isCorrect(ex, "  la   CUENTA, por favor  "))
    }

    @Test
    fun `trailing punctuation does not fail a correct answer`() {
        val ex = exercise(correctAnswer = "La cuenta, por favor.")
        assertTrue(AnswerGrader.isCorrect(ex, "La cuenta, por favor"))
    }

    @Test
    fun `wrong answer is incorrect`() {
        val ex = exercise(correctAnswer = "Cincuenta")
        assertFalse(AnswerGrader.isCorrect(ex, "Treinta"))
    }

    /** The previous implementation accepted any writing answer over 3 characters. */
    @Test
    fun `arbitrary text is not accepted for a writing exercise`() {
        val ex = exercise(type = ExerciseType.WRITING, correctAnswer = "La cuenta, por favor.")
        assertFalse(AnswerGrader.isCorrect(ex, "aaaa"))
    }

    @Test
    fun `accents are significant`() {
        val ex = exercise(correctAnswer = "¿Cuánto cuesta?")
        assertFalse(AnswerGrader.isCorrect(ex, "¿Cuanto cuesta?"))
    }

    @Test
    fun `falls back to target text when no explicit answer is set`() {
        val ex = exercise(targetText = "Hola", optionsJson = """["Hola","Adios"]""")
        assertTrue(AnswerGrader.isCorrect(ex, "Hola"))
        assertFalse(AnswerGrader.isCorrect(ex, "Adios"))
    }

    @Test
    fun `speaking drill with no answer and no options is practice only`() {
        val ex = exercise(type = ExerciseType.SPEAKING, targetText = "Me gustaría la cuenta.")
        assertTrue(AnswerGrader.isPracticeOnly(ex))
        // Practice drills are not graded, so the learner is never blocked.
        assertTrue(AnswerGrader.isCorrect(ex, ""))
    }

    @Test
    fun `exercise with options is not practice only`() {
        val ex = exercise(correctAnswer = "Hola", optionsJson = """["Hola","Adios"]""")
        assertFalse(AnswerGrader.isPracticeOnly(ex))
    }

    @Test
    fun `parses a json string array of options`() {
        val options = AnswerGrader.parseOptions("""["¿Cuánto cuesta?", "¿Cómo estás?", "¿Dónde está?"]""")
        assertEquals(listOf("¿Cuánto cuesta?", "¿Cómo estás?", "¿Dónde está?"), options)
    }

    @Test
    fun `parses an empty or malformed options list without throwing`() {
        assertEquals(emptyList<String>(), AnswerGrader.parseOptions("[]"))
        assertEquals(emptyList<String>(), AnswerGrader.parseOptions(""))
        assertEquals(emptyList<String>(), AnswerGrader.parseOptions("not json"))
    }

    @Test
    fun `parses options containing escaped quotes`() {
        val options = AnswerGrader.parseOptions("""["say \"hi\"", "bye"]""")
        assertEquals(listOf("say \"hi\"", "bye"), options)
    }

    @Test
    fun `isPracticeOnly with correct answer is false`() {
        val ex = exercise(correctAnswer = "Hola", optionsJson = "[]")
        assertFalse(AnswerGrader.isPracticeOnly(ex))
    }

    @Test
    fun `isPracticeOnly with blank correct answer and options is practice only`() {
        val ex = exercise(correctAnswer = "", optionsJson = "[]")
        assertTrue(AnswerGrader.isPracticeOnly(ex))
    }

    @Test
    fun `isPracticeOnly with blank correct answer and non-empty options is not practice only`() {
        val ex = exercise(correctAnswer = "", optionsJson = "[\"Hola\"]")
        assertFalse(AnswerGrader.isPracticeOnly(ex))
    }

    @Test
    fun `normalize handles multiple spaces`() {
        val ex = exercise(correctAnswer = "Hola Mundo")
        assertTrue(AnswerGrader.isCorrect(ex, "  hola    mundo  "))
    }

    @Test
    fun `normalize removes trailing punctuation consistently`() {
        val ex = exercise(correctAnswer = "Hola.")
        assertTrue(AnswerGrader.isCorrect(ex, "hola"))
        assertTrue(AnswerGrader.isCorrect(ex, "hola!"))
        assertTrue(AnswerGrader.isCorrect(ex, "hola?"))
        assertTrue(AnswerGrader.isCorrect(ex, "hola,"))
    }

    @Test
    fun `normalize preserves accents`() {
        val ex = exercise(correctAnswer = "Sí")
        assertTrue(AnswerGrader.isCorrect(ex, "sí"))
        assertFalse(AnswerGrader.isCorrect(ex, "si")) // without accent
    }

    @Test
    fun `parseOptions with single option no brackets fails gracefully`() {
        assertEquals(emptyList<String>(), AnswerGrader.parseOptions("Hola"))
        assertEquals(emptyList<String>(), AnswerGrader.parseOptions(""))
    }

    @Test
    fun `parseOptions with nested brackets fails gracefully`() {
        assertEquals(emptyList<String>(), AnswerGrader.parseOptions("[a[b]c]"))
    }

    @Test
    fun `isCorrect with practice exercise accepts any input`() {
        val ex = exercise(type = ExerciseType.SPEAKING, correctAnswer = "", targetText = "Say hello")
        assertTrue(AnswerGrader.isCorrect(ex, "anything"))
        assertTrue(AnswerGrader.isCorrect(ex, ""))
        assertTrue(AnswerGrader.isCorrect(ex, "   "))
    }
}
