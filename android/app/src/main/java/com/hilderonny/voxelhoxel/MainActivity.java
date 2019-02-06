package com.hilderonny.voxelhoxel;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {

    WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        final Context thisApp = this;
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.web_view);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            //https://www.codota.com/code/java/classes/android.webkit.JsResult
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                DialogInterface.OnClickListener dialogClickListener = new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        switch (which){
                            case DialogInterface.BUTTON_POSITIVE:
                                result.confirm();
                                break;

                            case DialogInterface.BUTTON_NEGATIVE:
                                result.cancel();
                                break;
                        }
                    }
                };
                AlertDialog.Builder builder = new AlertDialog.Builder(thisApp);
                builder.setMessage(message).setPositiveButton(getString(R.string.yes_button_text), dialogClickListener)
                        .setNegativeButton(getString(R.string.no_button_text), dialogClickListener).create().show();
                return true;
            }
        }); // For alerts
        WebView.setWebContentsDebuggingEnabled(true);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.loadUrl("file:///android_asset/index.html");
    }
}
