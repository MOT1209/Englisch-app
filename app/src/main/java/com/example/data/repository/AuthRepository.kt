package com.example.data.repository

import com.example.ai.AiTeacherReply
import com.example.data.db.LinguaVerseDao
import com.example.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.Dispatchers
import okhttp3.OkHttpClient
import okhttp3.MediaType
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AuthRepository(
    private val dao: LinguaVerseDao
) {

    private companion object {
        private const val BACKEND_BASE_URL = "http://10.0.2.2:3000"
        private const val TOKEN_KEY = "jwt_token"
        private const val USER_KEY = "user_profile"
    }

    private val moshi = com.squareup.moshi.Moshi.Builder().build()

    // Result pattern for operations
    sealed class Result<T>(val success: T?, val error: Throwable?) {
        companion object {
            fun success<T>(value: T): Result<T> = Result(success = value, error = null)
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
    )

    // Token storage using SharedPreferences
    private suspend fun saveToken(token: String) {
        android.content.SharedPreferences.getDefaultSharedPreferences(
            android.app.ApplicationProvider.getApplicationContext()
        ).edit().putString(TOKEN_KEY, token).apply()
    }

    private suspend fun loadToken(): String {
        return android.content.SharedPreferences.getDefaultSharedPreferences(
            android.app.ApplicationProvider.getApplicationContext()
        ).getString(TOKEN_KEY, "")
    }

    private suspend fun deleteToken() {
        android.content.SharedPreferences.getDefaultSharedPreferences(
            android.app.ApplicationProvider.getApplicationContext()
        ).edit().remove(TOKEN_KEY).apply()
    }

    // User profile storage
    private suspend fun saveUserProfile(profile: UserProfile) {
        val json = moshi.adapter(UserProfile::class.java).toJson(profile)
        android.content.SharedPreferences.getDefaultSharedPreferences(
            android.app.ApplicationProvider.getApplicationContext()
        ).edit().putString(USER_KEY, json).apply()
    }

    private suspend fun loadUserProfile(): UserProfile? {
        val json = android.content.SharedPreferences.getDefaultSharedPreferences(
            android.app.ApplicationProvider.getApplicationContext()
        ).getString(USER_KEY, "")
        if (json.isBlank()) return null
        return moshi.adapter(UserProfile::class.java).fromJson(json)
    }

    private suspend fun deleteUserProfile() {
        android.content.SharedPreferences.getDefaultSharedPreferences(
            android.app.ApplicationProvider.getApplicationContext()
        ).edit().remove(USER_KEY).apply()
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
                .post(RequestBody.create(payload, MediaType.get("application/json")))
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return Result.error(Exception("Login failed: ${response.code}"))
            }

            val responseJson = org.json.JSONObject(response.body?.string() ?: "{}")
            val success = responseJson.getBoolean("success")
            if (!success) {
                return Result.error(Exception(responseJson.getString("error") ?: "Login failed"))
            }

            val data = responseJson.getJSONObject("data")
            val token = data.getString("accessToken")
            val userProfile = UserProfile.fromJson(data.getJSONObject("user"))

            // Store token and profile
            saveToken(token)
            saveUserProfile(userProfile)

            // Fetch complete profile
            val profile = fetchUserProfile()

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
                .post(RequestBody.create(payload, MediaType.get("application/json")))
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                logout()
                return Result.error(Exception("Token refresh failed"))
            }

            val responseJson = org.json.JSONObject(response.body()?.string() ?: "{}")
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

            val responseJson = org.json.JSONObject(response.body()?.string() ?: "{}")
            val data = responseJson.getJSONObject("data")
            val profile = moshi.adapter(UserProfile::class.java).fromJson(data.toString())
            saveUserProfile(profile)
            return profile
        } catch (e: Exception) {
            logout()
            return null
        }
    }
}