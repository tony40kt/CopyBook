# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# 防止 R8 最佳化工具誤刪與混淆 Capacitor 核心與橋接外掛
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# 特別保護：確保 Cordova 外掛（如舊版內購與廣告套件）的反射機制不被破壞
-keep class org.apache.cordova.** { *; }
-keep class com.tony40kt.copybook.** { *; }

# Google Play 商店結帳 SDK 防護規則（確保付費功能 100% 穩定不跳退）
-keep class com.android.vending.billing.** { *; }
-keep class com.android.billingclient.** { *; }

# Google AdMob 廣告 SDK 防護規則
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
