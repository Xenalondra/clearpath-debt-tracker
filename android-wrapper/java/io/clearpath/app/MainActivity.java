package io.clearpath.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.ServiceWorkerController;
import android.webkit.ServiceWorkerWebSettings;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

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
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    if (android.os.Build.VERSION.SDK_INT >= 24) {
      ServiceWorkerWebSettings sw = ServiceWorkerController.getInstance().getServiceWorkerWebSettings();
      sw.setCacheMode(WebSettings.LOAD_DEFAULT);
      sw.setAllowContentAccess(false);
      sw.setAllowFileAccess(false);
    }
    webView.setWebViewClient(new WebViewClient() {
      @Override public void onReceivedError(WebView view, int code, String description, String failingUrl) {
        if (failingUrl != null && failingUrl.equals(APP_URL)) showOfflineMessage();
      }
    });
    setContentView(webView);
    webView.loadUrl(APP_URL);
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
