import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NookaMascot } from '@/components/nooka/nooka-mascot';
import { CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

type LoginStatus = 'idle' | 'loading' | 'error';
type Provider = 'google' | 'apple' | 'facebook' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const [status, setStatus] = useState<LoginStatus>('idle');
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  const handleGooglePress = () => {
    if (status === 'loading') return;

    if (status === 'idle') {
      setStatus('loading');
      setActiveProvider('google');

      setTimeout(() => {
        setStatus('error');
        setActiveProvider(null);
      }, 1800);
    } else if (status === 'error') {
      setStatus('loading');
      setActiveProvider('google');
      setTimeout(() => {
        setStatus('error');
        setActiveProvider(null);
      }, 1200);
    }
  };

  const handleOtherPress = (provider: Provider) => {
    if (status === 'loading') return;
    if (provider === 'email') {
      router.push('/auth/email-login');
      return;
    }
    setStatus('loading');
    setActiveProvider(provider);
    setTimeout(() => {
      setStatus('error');
      setActiveProvider(null);
    }, 1200);
  };

  const handleReportError = () => {
    flash(t('auth.toastReported'));
  };

  const isGoogleLoading = status === 'loading' && activeProvider === 'google';

  return (
    <ScreenShell testID="login-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Nút Back ở góc trên */}
        <View style={styles.header}>
          <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
        </View>

        {/* Mascot linh vật */}
        <View style={styles.mascotContainer}>
          <NookaMascot size={74} />
        </View>

        {/* Tiêu đề & Mô tả theo mẫu 3a */}
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('auth.loginSubtitleOptions')}</Text>

        {/* Thẻ Cảnh báo lỗi */}
        {status === 'error' && (
          <View style={[styles.errorBanner, { backgroundColor: colors.accentSoft, borderColor: colors.accentStrong }]}>
            <View style={[styles.errorIconCircle, { backgroundColor: colors.accent }]}>
              <Text style={[styles.errorIconText, { color: colors.onAccent }]}>!</Text>
            </View>
            <View style={styles.errorTextContainer}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>{t('auth.errorTitle')}</Text>
              <Text style={[styles.errorDesc, { color: colors.textMuted }]}>{t('auth.errorDesc')}</Text>
            </View>
          </View>
        )}

        {/* Danh sách nút đăng nhập theo mẫu 3a */}
        <View style={styles.buttonList}>
          {/* Google Button (Hàng 1) */}
          <Pressable
            accessibilityLabel={
              status === 'loading'
                ? t('auth.connectingGoogle')
                : status === 'error'
                  ? t('auth.retryGoogle')
                  : t('auth.continueGoogle')
            }
            accessibilityRole="button"
            disabled={status === 'loading' && !isGoogleLoading}
            onPress={handleGooglePress}
            style={({ pressed }) => [
              styles.socialButton,
              styles.primaryButton,
              {
                backgroundColor: colors.inverseSurface,
                borderColor: colors.inverseSurface,
                opacity: pressed || (status === 'loading' && !isGoogleLoading) ? 0.75 : 1,
              },
            ]}>
            {isGoogleLoading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color={colors.onInverse} size="small" style={styles.spinner} />
                <Text style={[styles.socialButtonText, { color: colors.onInverse }]}>{t('auth.connectingGoogle')}</Text>
              </View>
            ) : (
              <>
                <View style={[styles.badgeIconCircle, { backgroundColor: colors.onInverse }]}>
                  <Text style={[styles.googleBadgeText, { color: colors.inverseSurface }]}>G</Text>
                </View>
                <Text style={[styles.socialButtonText, { color: colors.onInverse }]}>
                  {status === 'error' ? t('auth.retryGoogle') : t('auth.continueGoogle')}
                </Text>
              </>
            )}
          </Pressable>

          {/* Hàng 2: Apple & Facebook chia đôi màn hình */}
          <View style={styles.halfButtonsRow}>
            <Pressable
              accessibilityLabel={t('auth.continueApple')}
              accessibilityRole="button"
              disabled={status === 'loading'}
              onPress={() => handleOtherPress('apple')}
              style={({ pressed }) => [
                styles.halfButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  opacity: pressed || status === 'loading' ? 0.6 : 1,
                },
              ]}>
              {status === 'loading' && activeProvider === 'apple' ? (
                <ActivityIndicator color={colors.text} size="small" style={styles.spinner} />
              ) : (
                <View style={[styles.badgeIconCircleSmall, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons color={colors.text} name="logo-apple" size={13} />
                </View>
              )}
              <Text style={[styles.socialButtonText, { color: colors.text }]}>{t('auth.continueApple')}</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={t('auth.continueFacebook')}
              accessibilityRole="button"
              disabled={status === 'loading'}
              onPress={() => handleOtherPress('facebook')}
              style={({ pressed }) => [
                styles.halfButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  opacity: pressed || status === 'loading' ? 0.6 : 1,
                },
              ]}>
              {status === 'loading' && activeProvider === 'facebook' ? (
                <ActivityIndicator color={colors.text} size="small" style={styles.spinner} />
              ) : (
                <View style={[styles.badgeIconCircleSmall, { backgroundColor: colors.surfaceMuted }]}>
                  <Ionicons color={colors.text} name="logo-facebook" size={13} />
                </View>
              )}
              <Text style={[styles.socialButtonText, { color: colors.text }]}>{t('auth.continueFacebook')}</Text>
            </Pressable>
          </View>

          {/* Đường gạch phân cách HOẶC */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
            <Text style={[styles.dividerText, { color: colors.textSubtle }]}>{t('auth.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
          </View>

          {/* Hàng 3: Tiếp tục với email */}
          <Pressable
            accessibilityLabel={t('auth.continueEmail')}
            accessibilityRole="button"
            disabled={status === 'loading'}
            onPress={() => handleOtherPress('email')}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                opacity: pressed || status === 'loading' ? 0.6 : 1,
              },
            ]}>
            {status === 'loading' && activeProvider === 'email' ? (
              <ActivityIndicator color={colors.text} size="small" style={styles.spinner} />
            ) : (
              <View style={[styles.badgeIconCircle, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons color={colors.text} name="mail-outline" size={15} />
              </View>
            )}
            <Text style={[styles.socialButtonText, { color: colors.text }]}>{t('auth.continueEmail')}</Text>
          </Pressable>
        </View>

        {/* Nối các Điều khoản & Chính sách */}
        <Text style={[styles.termsNotice, { color: colors.textMuted }]}>
          {t('auth.termsNoticePrefix')}
          <Text style={[styles.linkText, { color: colors.accentInk }]}>{t('auth.terms')}</Text>
          {t('auth.termsNoticeAnd')}
          <Text style={[styles.linkText, { color: colors.accentInk }]}>{t('auth.privacy')}</Text>
          {t('auth.termsNoticeSuffix')}
        </Text>

        {/* Nút Chưa có tài khoản? Tạo tài khoản */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/auth/email')}
          style={styles.createAccountFooter}>
          <Text style={[styles.createAccountText, { color: colors.textMuted }]}>
            {t('auth.noAccountPrefix')}
            <Text style={[styles.createAccountLink, { color: colors.accentInk }]}>{t('auth.createAccount')}</Text>
          </Text>
        </Pressable>

        {/* Link "Vẫn lỗi? Báo cho Nooka" khi ở trạng thái error */}
        {status === 'error' && (
          <Pressable accessibilityRole="button" onPress={handleReportError} style={styles.reportButton}>
            <Text style={[styles.reportText, { color: colors.textSubtle }]}>
              {t('auth.stillErrorPrefix')}
              <Text style={[styles.reportLink, { color: colors.accentInk }]}>{t('auth.reportError')}</Text>
            </Text>
          </Pressable>
        )}

        {/* Toast nổi dưới đáy khi đang kết nối */}
        {status === 'loading' && (
          <View style={[styles.processingToast, { backgroundColor: colors.inverseSurface }]}>
            <Text style={[styles.processingToastText, { color: colors.onInverse }]}>{t('auth.openingGoogle')}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  mascotContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  errorBanner: {
    width: '100%',
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  errorIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  errorIconText: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
  },
  errorDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  buttonList: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  socialButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  halfButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  halfButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    borderWidth: 0,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spinner: {
    marginRight: 4,
  },
  badgeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
  },
  socialButtonText: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  termsNotice: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 20,
    maxWidth: 320,
  },
  linkText: {
    fontWeight: '700',
  },
  createAccountFooter: {
    marginTop: 18,
    paddingVertical: 6,
  },
  createAccountText: {
    fontSize: 13,
    lineHeight: 18,
  },
  createAccountLink: {
    fontWeight: '700',
  },
  reportButton: {
    marginTop: 12,
    paddingVertical: 6,
  },
  reportText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  reportLink: {
    fontWeight: '700',
  },
  processingToast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingToastText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
  },
});
