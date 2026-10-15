package io.clearpath.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.ServiceWorkerController;
import android.webkit.ServiceWorkerWebSettings;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.ServiceWorkerClient;
import java.io.IOException;
import java.util.Collections;
import android.widget.TextView;
import android.widget.FrameLayout;
import android.content.Intent;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.net.Uri;
import org.json.JSONObject;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
  private static final String APP_URL = "https://clearpath-debt-planner.secretofwings31.chatgpt.site/";
  private WebView webView;
  private ValueCallback<Uri[]> backupPicker;
  private String pendingBackup, pendingFilename;
  private Uri savedBackup;
  private static final int OPEN_BACKUP = 401, SAVE_BACKUP = 402;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    webView = new WebView(this);
    webView.setBackgroundColor(Color.rgb(245, 243, 238));
    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(true);
    WebView.setWebContentsDebuggingEnabled(true);
    webView.addJavascriptInterface(new BackupBridge(), "ClearpathAndroid");
    webView.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
        if (backupPicker != null) backupPicker.onReceiveValue(null);
        backupPicker = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
        startActivityForResult(intent, OPEN_BACKUP);
        return true;
      }
      @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
        new android.app.AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Confirm", (dialog, which) -> result.confirm()).setNegativeButton("Cancel", (dialog, which) -> result.cancel()).setOnCancelListener(dialog -> result.cancel()).show();
        return true;
      }
    });
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    if (android.os.Build.VERSION.SDK_INT >= 24) {
      ServiceWorkerWebSettings sw = ServiceWorkerController.getInstance().getServiceWorkerWebSettings();
      sw.setCacheMode(WebSettings.LOAD_NO_CACHE);
      sw.setAllowContentAccess(false);
      sw.setAllowFileAccess(false);
      ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
        @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
          return bundledResource(request.getUrl());
        }
      });
    }
    webView.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if ("https".equals(request.getUrl().getScheme()) && "clearpath-debt-planner.secretofwings31.chatgpt.site".equals(request.getUrl().getHost())) return false;
        if (request.isForMainFrame()) startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
        return true;
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return bundledResource(request.getUrl());
      }
      @Override public void onReceivedError(WebView view, int code, String description, String failingUrl) {
        if (failingUrl != null && failingUrl.equals(APP_URL)) showOfflineMessage();
      }
    });
    FrameLayout container = new FrameLayout(this);
    container.setBackgroundColor(Color.rgb(32, 35, 51));
    // Target SDK 35 enables edge-to-edge; keep web controls clear of system bars.
    container.setOnApplyWindowInsetsListener((view, insets) -> {
      view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
          insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
      return insets;
    });
    container.addView(webView, new FrameLayout.LayoutParams(-1, -1));
    setContentView(container);
    webView.loadUrl(APP_URL);
  }

  private WebResourceResponse bundledResource(android.net.Uri uri) {
    // No foreign subframes/scripts can access the native backup bridge.
    if (!"https".equals(uri.getScheme()) || !"clearpath-debt-planner.secretofwings31.chatgpt.site".equals(uri.getHost())) return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
    if (!"https".equals(uri.getScheme()) || !"clearpath-debt-planner.secretofwings31.chatgpt.site".equals(uri.getHost())) return null;
    String route = uri.getPath();
    if (route == null || route.contains("..")) return null;
    if (route.equals("/")) route = "/index.html";
    else if (route.equals("/debts") || route.equals("/expenses") || route.equals("/activity") || route.equals("/settings") || route.equals("/payments")) route += "/index.html";
    String mime = route.endsWith(".html") ? "text/html" : route.endsWith(".js") ? "application/javascript" : route.endsWith(".css") ? "text/css" : route.endsWith(".svg") ? "image/svg+xml" : route.endsWith(".json") || route.endsWith(".webmanifest") ? "application/json" : route.endsWith(".png") ? "image/png" : "application/octet-stream";
    try {
      return new WebResourceResponse(mime, "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-store"), getAssets().open("web" + route));
    } catch (IOException missing) { return null; }
  }

  private void showOfflineMessage() {
    TextView message = new TextView(this);
    message.setText("Clearpath is offline\n\nConnect once to load the app. After that, your saved plan remains on this phone and the app can reopen offline.");
    message.setTextSize(18);
    message.setTextColor(Color.rgb(32, 35, 50));
    message.setPadding(48, 80, 48, 48);
    message.setBackgroundColor(Color.rgb(245, 243, 238));
    setContentView(message);
  }

  private class BackupBridge {
    @JavascriptInterface public void saveBackup(String filename, String json) {
      runOnUiThread(() -> {
        if (webView.getUrl() == null || !webView.getUrl().startsWith(APP_URL)) return;
        pendingBackup = json; pendingFilename = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, pendingFilename);
        startActivityForResult(intent, SAVE_BACKUP);
      });
    }
    @JavascriptInterface public void shareBackup() {
      runOnUiThread(() -> {
        if (savedBackup == null || webView.getUrl() == null || !webView.getUrl().startsWith(APP_URL)) return;
        Intent intent = new Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_STREAM, savedBackup).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.setClipData(android.content.ClipData.newRawUri("Clearpath backup", savedBackup));
        startActivity(Intent.createChooser(intent, "Share Clearpath backup"));
      });
    }
  }

  @Override protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request == OPEN_BACKUP && backupPicker != null) {
      backupPicker.onReceiveValue(result == RESULT_OK && data != null ? new Uri[]{data.getData()} : null); backupPicker = null;
    }
    if (request == SAVE_BACKUP) {
      boolean success = false;
      if (result == RESULT_OK && data != null && data.getData() != null && pendingBackup != null) {
        try (OutputStream stream = getContentResolver().openOutputStream(data.getData(), "wt")) {
          stream.write(pendingBackup.getBytes(StandardCharsets.UTF_8)); stream.flush(); savedBackup = data.getData(); success = true;
          try (android.database.Cursor cursor = getContentResolver().query(savedBackup, new String[]{android.provider.OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) pendingFilename = cursor.getString(0);
          }
        } catch (Exception failure) { success = false; }
      }
      String detail = "{\"success\":"+success+",\"cancelled\":"+(result != RESULT_OK)+",\"filename\":"+JSONObject.quote(pendingFilename)+"}";
      webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('clearpath-backup-result',{detail:"+detail+"}))", null);
      pendingBackup = null;
    }
  }

  @Override public void onBackPressed() {
    if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
  }
}
