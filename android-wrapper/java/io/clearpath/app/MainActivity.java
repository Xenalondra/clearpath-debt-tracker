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

public class MainActivity extends Activity {
  private static final String APP_URL = "https://clearpath-debt-planner.secretofwings31.chatgpt.site/";
  private WebView webView;

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

  @Override public void onBackPressed() {
    if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
  }
}
