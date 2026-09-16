package com.example.data.repository

import android.content.Context
import com.example.data.db.LinguaVerseDao
import com.example.data.model.*
import kotlinx.coroutines.flow.Flow
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AuthRepository(
    private val dao: LinguaVerseDao,
    private val context: Context
) {

    private companion object {
        private const val BACKEND_BASE_URL = "http://10.0.2.2:3000"
        private const val PREFS_NAME = "auth_prefs"
        private const val TOKEN_KEY = "jwt_token"
        private const val USER_KEY = "user_profile"
    }

    private val moshi = com.squareup.moshi.Moshi.Builder().build()
    private val prefs get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // Result pattern for operations
    open class Result<out T>(val success: T?, val error: Throwable?) {
        companion object {
            fun <T> success(value: T): Result<T> = Result(success = value, error = null)
            fun error(e: Throwable): Result<Nothing> = Result(success = null, error = e)
        }
    }

    // User profile data class
    data class UserProfile(
        val id: String = "user_default",
        val username: String = "Anonymous",
        val email: String = "",
        val xp: Int = 0,
        val coins: Int = 0,
        val streakCount: Int = 0,
        val dailyGoalXp: Int = 50,
        val todayXp: Int = 0
    ) {
        companion object {
            fun fromJson(obj: JSONObject): UserProfile = UserProfile(
                id = obj.optString("id", "user_default"),
                username = obj.optString("username", "Anonymous"),
                email = obj.optString("email"),
                xp = obj.optInt("xp", 0),
                coins = obj.optInt("coins", 0),
                streakCount = obj.optInt("streakCount", 0),
                dailyGoalXp = obj.optInt("dailyGoalXp", 50),
                todayXp = obj.optInt("todayXp", 0)
            )
        }
    }

    private suspend fun saveToken(token: String) {
        prefs.edit().putString(TOKEN_KEY, token).apply()
    }

    private suspend fun loadToken(): String {
        return prefs.getString(TOKEN_KEY, "") ?: ""
    }

    private suspend fun deleteToken() {
        prefs.edit().remove(TOKEN_KEY).apply()
    }

    private suspend fun saveUserProfile(profile: UserProfile) {
        val json = moshi.adapter(UserProfile::class.java).toJson(profile)
        prefs.edit().putString(USER_KEY, json).apply()
    }

    private suspend fun loadUserProfile(): UserProfile? {
        val json = prefs.getString(USER_KEY, "") ?: ""
        if (json.isBlank()) return null
        return moshi.adapter(UserProfile::class.java).fromJson(json)
    }

    private suspend fun deleteUserProfile() {
        prefs.edit().remove(USER_KEY).apply()
    }

    // Login with username/password
    suspend fun login(username: String, password: String): Result<UserProfile> {
        return try {
            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            val payload = """{"username":"$username","password":"$password"}"""
            val request = Request.Builder()
                .url("$BACKEND_BASE_URL/auth/login")
                .post(payload.toRequestBody("application/json".toMediaType()))
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return Result.error(Exception("Login failed: ${response.code}"))
            }

            val responseJson = JSONObject(response.body?.string() ?: "{}")
            val success = responseJson.getBoolean("success")
            if (!success) {
                return Result.error(Exception(responseJson.getString("error")))
            }

            val data = responseJson.getJSONObject("data")
            val token = data.getString("accessToken")
            val userProfile = UserProfile.fromJson(data.getJSONObject("user"))

            // Store token and profile
            saveToken(token)
            saveUserProfile(userProfile)

            // Fetch complete profile
            val profile = fetchUserProfile() ?: userProfile

            Result.success(profile)
        } catch (e: Exception) {
            Result.error(e)
        }
    }

    // Refresh JWT token using refresh token
    suspend fun refreshToken(): Result<String> {
        return try {
            val token = loadToken()
            if (token.isBlank()) {
                return Result.error(Exception("No token found - please login again"))
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            val payload = """{"refreshToken":"$token"}"""
            val request = Request.Builder()
                .url("$BACKEND_BASE_URL/auth/refresh")
                .post(payload.toRequestBody("application/json".toMediaType()))
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                logout()
                return Result.error(Exception("Token refresh failed"))
            }

            val responseJson = JSONObject(response.body?.string() ?: "{}")
            val newToken = responseJson.getJSONObject("data").getString("accessToken")
            saveToken(newToken)
            Result.success(newToken)
        } catch (e: Exception) {
            Result.error(e)
        }
    }

    // Logout - clear local token and profile
    suspend fun logout() {
        deleteToken()
        deleteUserProfile()
    }

    // Get current logged-in user
    suspend fun getCurrentUser(): UserProfile? {
        return loadUserProfile()
    }

    // Fetch user profile from backend
    suspend fun fetchUserProfile(): UserProfile? {
        val token = loadToken()
        if (token.isBlank()) return null

        try {
            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            val request = Request.Builder()
                .url("$BACKEND_BASE_URL/me")
                .header("Authorization", "Bearer $token")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                logout()
                return null
            }

            val responseJson = JSONObject(response.body?.string() ?: "{}")
            val data = responseJson.getJSONObject("data")
            val profile = moshi.adapter(UserProfile::class.java).fromJson(data.toString())
            if (profile == null || profile.id.isBlank()) {
                logout()
                return null
            }
            saveUserProfile(profile)
            return profile
        } catch (e: Exception) {
            logout()
            return null
        }
    }
}