//
//  ViewController.swift
//  Voxelhoxel
//
//  Created by Ronny on 06.02.19.
//  Copyright © 2019 Ronny Hildebrandt. All rights reserved.
//

import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate {
    
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        let url = URL(string: "https://www.voxelhoxel.de")!
        webView.load(URLRequest(url: url))
        /*
        let indexFilePath = Bundle.main.path(forResource: "index", ofType: "html")!
        let indexContents = try? String(contentsOfFile: indexFilePath, encoding: .utf8)
        let baseUrl = URL(fileURLWithPath: indexFilePath)
        webView.loadHTMLString(indexContents!, baseURL: baseUrl)
 */
    }
    
    override func loadView() {
        webView = WKWebView()
        webView.navigationDelegate = self
        view = webView
    }


}

