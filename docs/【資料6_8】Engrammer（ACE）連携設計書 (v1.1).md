# **【資料6/8】Engrammer（ACE）連携設計書 (v1.1)**

## **1\. 概要**

本資料は、フロントエンド（クライアントサイド、主に App.tsx）と、LangGraph 1.0\[cite: LangChain/LangGraph 1.0 詳細調査計画\]で構築された自己改善AIエージェント「**Engrammer**」（旧称: ACEエージェント\[cite: PROJECT\_STATUS.md\]）バックエンドとの間の通信インターフェースとデータフローを詳細に定義する。

**v1.1の主な変更点:**

* **名称変更:** 「ACEエージェント」および関連フロー (aceFlow\[cite: firebase.ts\]) を「**Engrammer**」および「engrammerFlow」\[cite: engram\_backend\_api\_design.ts\]に統一する。  
* **非同期・耐久性アーキテクチャ (改善案\#2):** LangGraph 1.0\[cite: LangChain/LangGraph 1.0 詳細調査計画\]の Checkpointer\[cite: LangChain/LangGraph 1.0 詳細調査計画\]を活用し、engrammerFlow\[cite: engram\_backend\_api\_design.ts\]の呼び出しを非同期化する。クライアントは即座に threadId\[cite: LangChain/LangGraph 1.0 詳細調査計画\] を受け取り、バックグラウンド処理（Reflector\[cite: ACEアルゴリズムJavaScript実装ガイド.md\], Curator\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]）の完了を待たずにUI操作を可能にする。  
* **ヒューマンインザループ (HITL) フロー (改善案\#1):** LangGraph 1.0\[cite: LangChain/LangGraph 1.0 詳細調査計画\]の interrupt\[cite: LangChain/LangGraph 1.0 詳細調査計画\] 機能に基づき、Engrammer の学習ステップ（Curator\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]の実行）をユーザーが明示的に承認するフローを定義する。  
* **状態監視フローの定義:** 非同期化に伴い、クライアントが Engrammer の最新状態を取得するための getEngrammerState\[cite: engram\_backend\_api\_design.ts\] フローを定義する。  
* **参照ノート取得APIの名称変更:** getPlaybookNote\[cite: firebase.ts\] を engrammerFlow\_getNote\[cite: engram\_backend\_api\_design.ts\] に変更する。

## **2\. Engrammer 連携シーケンス (v1.1)**

ユーザーが MainPage.tsx\[cite: MainPage.tsx\] で engrammerQuery\[cite: MainPage.tsx\] を送信した際の、非同期・HITLフロー。

### **ステップ1: Engrammer 実行開始 (callEngrammerFlow)**

1. **トリガー:** ユーザーが MainPage.tsx\[cite: MainPage.tsx\] の「Insight Bloom」ボタンをクリックする。  
2. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * setIsEngrammerWorking(true)\[cite: App.tsx\] をセット（UIは InsightBloomAnimation\[cite: InsightBloomAnimation.tsx\] を開始）。  
   * setEngrammerResult(null)\[cite: App.tsx\], setEngrammerError(null)\[cite: App.tsx\] で古い結果をクリア。  
   * threadId\[cite: LangChain/LangGraph 1.0 詳細調査計画\] を決定する。  
     * もし App.tsx\[cite: App.tsx\] の state に現在の engrammerThreadId があれば、それを再利用する。  
     * なければ、新しい threadId \= 'engrammer-thread-' \+ uuidv4() を生成する。  
   * **engrammerFlow\_start**\[cite: engram\_backend\_api\_design.ts\] (Firebase Function) を await で呼び出す。  
   * ペイロード: { query: engrammerQuery, threadId: threadId }  
3. **バックエンド (engrammerFlow\_start\[cite: engram\_backend\_api\_design.ts\]):**  
   * LangGraph\[cite: LangChain/LangGraph 1.0 詳細調査計画\] グラフ (StateGraph\[cite: LangChain/LangGraph 1.0 詳細調査計画\]) を threadId\[cite: LangChain/LangGraph 1.0 詳細調査計画\] と Firestore Checkpointer\[cite: LangChain/LangGraph 1.0 詳細調査計画\] で compile()\[cite: ACEアルゴリズムJavaScript実装ガイド.md\] する。  
   * graph.invoke({ query, messages: \[new HumanMessage(query)\] }, config)\[cite: ACEアルゴリズムJavaScript実装ガイド.md\] を **await せずに** バックグラウンドで実行開始する（HTTP Functionの res.send() で即座に応答を返すため）。  
   * 即座にクライアントへ { threadId: threadId } を返す。  
4. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * 返された threadId を setEngrammerThreadId(threadId) で state に保存する。  
   * startEngrammerPolling(threadId) を呼び出す（ステップ2へ）。

### **ステップ2: Engrammer 状態監視 (startEngrammerPolling)**

1. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * setInterval（例: 2秒ごと）を開始し、getEngrammerState\[cite: engram\_backend\_api\_design.ts\] (Firebase Function) を呼び出す。  
   * ペイロード: { threadId: engrammerThreadId }  
2. **バックエンド (getEngrammerState\[cite: engram\_backend\_api\_design.ts\]):**  
   * Firestore Checkpointer\[cite: LangChain/LangGraph 1.0 詳細調査計画\] を使用し、threadId\[cite: LangChain/LangGraph 1.0 詳細調査計画\] に紐づく最新の AgentState\[cite: ACEアルゴリズムJavaScript実装ガイド.md\] スナップショットをFirestoreから取得する。  
   * クライアントに必要な情報（AgentState\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]の一部）を返す。  
   * レスポンス: { status: 'running' | 'interrupted' | 'done', latestResponse: string | null, insights: ReflectorInsight\[\] | null }  
3. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * ポーリング結果（status）に応じてUIを更新する。  
   * status \=== 'running': setIsEngrammerWorking(true)\[cite: App.tsx\] を維持。latestResponse があれば setEngrammerResult\[cite: App.tsx\] で表示（Generator\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]の分析結果が先に出る）。  
   * status \=== 'interrupted': **HITL フロー**へ移行（ステップ3へ）。  
   * status \=== 'done': ポーリングを停止し、setIsEngrammerWorking(false)\[cite: App.tsx\] をセット（アニメーション終了）。latestResponse を setEngrammerResult\[cite: App.tsx\] で最終表示。

### **ステップ3: HITL \- 学習の承認 (EngrammerFeedbackPrompt)**

1. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * status \=== 'interrupted' を検知。  
   * ポーリングを停止し、setIsEngrammerWorking(false)\[cite: App.tsx\] をセット（アニメーション終了）。  
   * setEngrammerResult(latestResponse)\[cite: App.tsx\] で Generator\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]の分析結果を表示する。  
   * setPendingInsights(insights)\[cite: engram\_ui\_component\_design\_v1.1.md\] で、Reflector\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]が生成した洞察を state に保持する。  
   * MainPage.tsx\[cite: MainPage.tsx\] は pendingInsights\[cite: engram\_ui\_component\_design\_v1.1.md\] が存在することを検知し、EngrammerFeedbackPrompt\[cite: engram\_ui\_component\_design\_v1.1.md\] コンポーネント（「この洞察を学習させますか？」\[cite: LangChain/LangGraph 1.0 詳細調査計画\]）を表示する。  
2. **トリガー:** ユーザーが EngrammerFeedbackPrompt\[cite: engram\_ui\_component\_design\_v1.1.md\] の「承認 (Approve)」ボタンをクリックする。  
3. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * continueEngrammerFlow()\[cite: engram\_ui\_component\_design\_v1.1.md\] を呼び出す。  
   * setIsEngrammerWorking(true)\[cite: App.tsx\] をセット（学習中アニメーション）。  
   * **engrammerFlow\_continue**\[cite: engram\_backend\_api\_design.ts\] (Firebase Function) を await で呼び出す。  
   * ペイロード: { threadId: engrammerThreadId, userInput: 'approve\_learning' }  
4. **バックエンド (engrammerFlow\_continue\[cite: engram\_backend\_api\_design.ts\]):**  
   * threadId\[cite: LangChain/LangGraph 1.0 詳細調査計画\] で StateGraph\[cite: LangChain/LangGraph 1.0 詳細調査計画\] を Checkpointer\[cite: LangChain/LangGraph 1.0 詳細調査計画\] から再開（resume）する。  
   * graph.invoke(null, config)\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]（または graph.resume() に相当する処理）を実行し、Curator\[cite: ACEアルゴリズムJavaScript実装ガイド.md\]ノード（プレイブック更新）を実行させる。  
   * グラフが END\[cite: ACEアルゴリズムJavaScript実装ガイド.md\] に達するまで待ち、最終状態を返す。  
5. **クライアント (App.tsx\[cite: App.tsx\]):**  
   * setIsEngrammerWorking(false)\[cite: App.tsx\] をセット。  
   * setPendingInsights(null)\[cite: engram\_ui\_component\_design\_v1.1.md\] で承認UIを非表示にする。

## **3\. 参照ノート取得フロー (handleFeedbackClick)**

* **責務:** Engrammer の応答（engrammerResult.feedback.useful\[cite: MainPage.tsx\]）に含まれる「Ref」ボタン\[cite: MainPage.tsx\]がクリックされた際に、該当するノート情報を取得しモーダル表示する。  
* **v1.1の変更点:** Engrammer が Supervisor\[cite: LangChain/LangGraph 1.0 詳細調査計画\]（改善案\#4）として動作し、複数の知識源（ローカルDB、木工DB\[cite: user\_provided\_info\]など）を参照する可能性があるため、APIを拡張する。  
* **処理フロー:**  
  1. **トリガー:** ユーザーが MainPage.tsx\[cite: MainPage.tsx\] の Ref ボタン（onClick={() \=\> handleFeedbackClick(ref)}\[cite: MainPage.tsx\]）をクリックする。ref オブジェクトは Engrammer\[cite: engram\_backend\_api\_design.ts\] から返される { source: 'local\_db' | 'playbook' | 'woodworking\_db', noteId: '...' } という構造化オブジェクトである。  
  2. **クライアント (App.tsx\[cite: App.tsx\] handleFeedbackClick\[cite: App.tsx\]):**  
     * ref.source \=== 'local\_db':  
       * note \= await db.notes.get(ref.noteId)\[cite: db.ts\] でローカルDB\[cite: db.ts\]から取得する。  
     * ref.source \=== 'playbook' または ref.source \=== 'woodworking\_db':  
       * note \= await engrammerFlow\_getNote({ source: ref.source, noteId: ref.noteId })\[cite: engram\_backend\_api\_design.ts\] を呼び出し、バックエンドの専門知識DBから取得する。  
  3. 取得した note\[cite: db.ts\] データ（またはエラーメッセージ）を NoteReferenceModal\[cite: engram\_ui\_component\_design\_v1.1.md\] で表示する。

## **4\. データ構造（クライアント ⇔ Engrammer）**

### **4.1. engrammerFlow\_start\[cite: engram\_backend\_api\_design.ts\] (Request)**

{  
  "query": "string", // ユーザーが入力したクエリ  
  "threadId": "string" // クライアントで管理するセッションID  
}

### **4.2. engrammerFlow\_start\[cite: engram\_backend\_api\_design.ts\] (Response)**

{  
  "threadId": "string" // 開始されたグラフのセッションID  
}

### **4.3. getEngrammerState\[cite: engram\_backend\_api\_design.ts\] (Request)**

{  
  "threadId": "string"  
}

### **4.4. getEngrammerState\[cite: engram\_backend\_api\_design.ts\] (Response)**

{  
  // LangGraph の現在の実行状態  
  "status": "running" | "interrupted" | "done" | "error",  
  // Generator が生成した最新のMarkdown応答  
  "latestResponse": "string" | null,  
  // Reflector が生成し、HITLでの承認待ちの洞察  
  "pendingInsights": \[  
    {  
      "type": "new\_strategy" | "refine\_strategy" | "error\_pattern",  
      "description": "string",  
      "source\_bullet\_id": "string" | null  
    }  
  \] | null,  
  // 参照ノート（Supervisor が使用した知識源）  
  "references": \[  
    {  
      "source": "local\_db" | "playbook" | "woodworking\_db",  
      "noteId": "string"  
    }  
  \] | null,  
  "error": "string" | null  
}

### **4.5. engrammerFlow\_continue\[cite: engram\_backend\_api\_design.ts\] (Request)**

{  
  "threadId": "string",  
  "userInput": "approve\_learning" | "reject\_learning" // ユーザーのHITL応答  
}

### **4.6. engrammerFlow\_continue\[cite: engram\_backend\_api\_design.ts\] (Response)**

{  
  "status": "done" | "error", // 学習サイクル（Curator）実行後の最終状態  
  "error": "string" | null  
}

### **4.7. engrammerFlow\_getNote\[cite: engram\_backend\_api\_design.ts\] (Request)**

{  
  "source": "playbook" | "woodworking\_db", // 取得元のDBを指定  
  "noteId": "string"  
}

### **4.8. engrammerFlow\_getNote\[cite: engram\_backend\_api\_design.ts\] (Response)**

* 【資料2/8】\[cite: engram\_database\_design\_v1.1.md\]で定義された Note\[cite: db.ts\] オブジェクト（またはそれに準ずる構造）。

{  
  "id": "string",  
  "type": "text",  
  "content": "string", // Noteの内容  
  "createdAt": "string" // ISO 8601 形式  
  // ... その他Noteフィールド  
}  
