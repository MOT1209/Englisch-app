package com.example.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import com.example.R
import com.example.data.model.Achievement
import com.example.data.model.UserProfile
import com.example.ui.components.LevelChip
import com.example.ui.components.display.LinguaAvatar
import com.example.ui.components.display.LinguaBadge
import com.example.ui.components.display.LinguaCard
import com.example.ui.theme.LinguaVerseDimens
import com.example.ui.theme.extendedColors

@Composable
fun ProfileScreen(
    userProfile: UserProfile,
    achievements: List<Achievement>,
    targetLanguageName: String,
    onOpenSettings: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = LinguaVerseDimens.ScreenHorizontalPadding)
            .testTag("profile_screen"),
        contentPadding = PaddingValues(
            top = LinguaVerseDimens.ScreenVerticalPadding,
            bottom = LinguaVerseDimens.SectionSpacing
        ),
        verticalArrangement = Arrangement.spacedBy(LinguaVerseDimens.ComponentSpacing)
    ) {
        // ظ¤ظ¤ Header ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.learning_profile),
                    style = MaterialTheme.typography.headlineSmall
                )
                IconButton(onClick = onOpenSettings) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = stringResource(R.string.open_settings)
                    )
                }
            }
        }

        // ظ¤ظ¤ Avatar Card ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
        item {
            LinguaCard(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Column(
                    modifier = Modifier.padding(LinguaVerseDimens.CardPadding),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    LinguaAvatar(
                        initials = userProfile.username.take(2).uppercase(),
                        size = LinguaVerseDimens.AvatarExtraLarge
                    )

                    Spacer(modifier = Modifier.height(LinguaVerseDimens.ComponentSpacing))

                    Text(
                        text = userProfile.username,
                        style = MaterialTheme.typography.headlineSmall
                    )

                    Spacer(modifier = Modifier.height(LinguaVerseDimens.InlineSpacing))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = stringResource(R.string.current_level),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(LinguaVerseDimens.InlineSpacing))
                        LevelChip(level = userProfile.currentLevel)
                    }

                    Spacer(modifier = Modifier.height(LinguaVerseDimens.SectionSpacing))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        ProfileStatItem(
                            title = stringResource(R.string.total_xp),
                            value = "${userProfile.xp}",
                            icon = Icons.Default.Stars,
                            color = MaterialTheme.extendedColors.xp
                        )
                        ProfileStatItem(
                            title = stringResource(R.string.streak),
                            value = stringResource(R.string.streak_days_format, userProfile.streakCount),
                            icon = Icons.Default.LocalFireDepartment,
                            color = MaterialTheme.extendedColors.streak
                        )
                        ProfileStatItem(
                            title = stringResource(R.string.profile_lessons),
                            value = "${userProfile.totalCompletedLessons}",
                            icon = Icons.Default.School,
                            color = MaterialTheme.extendedColors.skillPalette[9]
                        )
                    }
                }
            }
        }

        // ظ¤ظ¤ Achievements ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤
        item {
            Text(
                text = stringResource(R.string.achievements_title),
                style = MaterialTheme.typography.titleLarge
            )
        }

        items(achievements) { ach ->
            LinguaCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = MaterialTheme.colorScheme.surfaceColorAtElevation(LinguaVerseDimens.CardElevation),
                showBorder = false
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LinguaAvatar(
                        initials = if (ach.isUnlocked) "\uD83C\uDFC6" else "\uD83D\uDD12",
                        size = LinguaVerseDimens.AvatarMedium,
                        backgroundColor = if (ach.isUnlocked) MaterialTheme.extendedColors.xpContainer else MaterialTheme.colorScheme.surfaceContainerHighest,
                        contentColor = if (ach.isUnlocked) MaterialTheme.extendedColors.xp else MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.width(LinguaVerseDimens.ComponentSpacing))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = ach.title,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = ach.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    LinguaBadge(
                        text = stringResource(R.string.xp_earned_format, ach.rewardXp),
                        containerColor = MaterialTheme.extendedColors.xpContainer,
                        contentColor = MaterialTheme.extendedColors.onXpContainer
                    )
                }
            }
        }
    }
}

// ظ¤ظ¤ Reusable Helpers ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤ظ¤

@Composable
private fun ProfileStatItem(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(LinguaVerseDimens.IconMedium)
        )
        Spacer(modifier = Modifier.height(LinguaVerseDimens.InlineSpacing))
        Text(text = value, style = MaterialTheme.typography.titleMedium)
        Text(
            text = title,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
