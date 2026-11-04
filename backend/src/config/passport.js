const passport = require('passport');
const KakaoStrategy = require('passport-kakao').Strategy;
const NaverStrategy = require('passport-naver').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateSocialUser } = require('../services/authService');

function initPassport() {
  // ── 카카오 ────────────────────────────────────
  if (process.env.KAKAO_CLIENT_ID) {
    passport.use(new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
        callbackURL: process.env.KAKAO_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser({
            provider: 'kakao',
            providerId: String(profile.id),
            nickname: profile.displayName || profile.username,
            email: profile._json?.kakao_account?.email || null,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    ));
  }

  // ── 네이버 ────────────────────────────────────
  if (process.env.NAVER_CLIENT_ID) {
    passport.use(new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: process.env.NAVER_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser({
            provider: 'naver',
            providerId: String(profile.id),
            nickname: profile.displayName || null,
            email: profile.email || null,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    ));
  }

  // ── 구글 ─────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser({
            provider: 'google',
            providerId: String(profile.id),
            nickname: profile.displayName || null,
            email: profile.emails?.[0]?.value || null,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    ));
  }
}

module.exports = { initPassport };
