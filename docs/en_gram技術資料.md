# **en:gram - 自動システム構築のための包括的技術設計書**

## **エグゼクティブ・サマリー**

本ドキュメントは、en:gramシステムの決定的な技術設計書として機能します。高度なAI大規模言語モデルによる自動構築を可能にするため、十分な粒度と規範的な詳細をもって設計されています。このレポートは、システムのビジョン、環境設定、データモデル、バックエンドサービス、フロントエンドアプリケーション、そして中核となるAIロジックに至るまで、すべてのアーキテクチャ、設計、および実装仕様を、信頼できる唯一の情報源（Canonical Source of Truth）として統合したものです。

---

## **第 I 部: システム設計思想：ビジョン、原則、アーキテクチャ**

本セクションでは、en:gramシステムの根幹をなす「なぜ（why）」と「何を（what）」を確立し、その哲学的ビジョンを具体的かつ実行可能なアーキテクチャ上の指令へと変換します。

### **1.1. en:gramの哲学：「Insight Bloom」**

#### **コアコンセプト**

本システムの主要な目的は、「Insight Bloom」、すなわち知的探求におけるパートナーとして機能することです 1。これは単なるノート記録ユーティリティを超越し、ユーザーが記録した思考の断片間に存在する、予期せぬ、あるいは深遠な繋がり（「縁」）を発見し、提示するシステムです。

#### **指導理念**

「記録は、忘れるためにある」という哲学は、ユーザーが認知的な負荷（混沌とした「ノイズ」さえも含む）をシステムにオフロードし、AIがその根底にある「響き（共鳴）」を見つけ出すことを信頼するよう促すものです 1。これは、ユーザーが思考の複雑さを恐れることなく、安心してその内なる宇宙をen:gramに委ねるための招待状なのです。

#### **ユーザー体験のメタファー**

en:gramにおける体験は、ユーザー自身の「内なる宇宙」を探検する旅として構成されます。AIはその旅のガイドとして機能し、ユーザーが自身の「思考の星座」を航海する手助けをします 1。この抽象的な概念は、木工デザイナーの創造プロセスを描写したデモシナリオによって具体的に示されます。例えば、デザイナーがインスピレーションを受けた北欧の玩具の写真、環境音の録音、手触りに関するメモといった雑多な素材をen:gramに記録します。後日、システムは「雨音」の録音と過去の「デザイン哲学」に関するメモとの間に静かで心地よい共通の響きがあることや、「接合部」という課題が過去の3Dプリンター製ジョイントパーツのアイデアと共鳴していることを提案します。これにより、デザイナーは過去の無意識に捉えたノイズさえも未来の創造のための重要なシグナルへと変換することができるのです 1。

### **1.2. コアアーキテクチャ原則**

#### **ローカルファースト・アーキテクチャ**

この原則は、ユーザーのプライバシーとデータ所有権を技術的に支える主要な柱です 2。ユーザーが生成したすべてのデータ（NoteおよびRelationエンティティ）は、原則としてクライアントのブラウザ内にあるIndexedDBに保存されます。これにより、主要機能のオフライン利用が保証され、外部サーバーへのデータ送信が最小限に抑えられます 2。この原則の直接的な実装として、IndexedDBのラッパーであるDexie.jsが採用されており、クライアントサイドでの堅牢なデータベース管理APIを提供します 3。このアーキテクチャの選択は、システムの哲学であるプライベートな「内なる宇宙」を、単なるマーケティング上の主張ではなく、技術的に具現化するものです 1。

#### **ハイブリッドAIモデル**

この原則は、純粋なオンデバイスAIアプローチにおける現実的な制約に対処します。AIによる洞察生成のために、二重の戦略を規定しています 2。

*   **第一経路（オンデバイス）:** システムはまず、ブラウザに統合されたwindow.ai / LanguageModel APIの利用を試みます。これにより、ユーザーのローカルハードウェア（Gemini Nano）を活用し、最大限のプライバシーと低レイテンシを実現します 2。これは、本プロジェクトの開発背景からくる必須要件でもあります 2。
*   **フォールバック経路（クラウド）:** オンデバイスモデルが利用不可能、または失敗した場合、システムはシームレスかつ自動的にサーバーレスのクラウド関数（Firebase上でホストされるfindConnectionsCloud）に処理を引き継ぎ、同じタスクを実行します 2。

このハイブリッドモデルは、単に二つの選択肢を提供するだけではありません。これは、中核機能である洞察発見が、ユーザーの多様な環境やネットワーク状況下でも機能し続けることを保証するための、回復力と段階的劣化（Graceful Degradation）を考慮した正式な戦略です。これにより、機能の可用性が最優先されます。

#### **Agentic Context Engineering (Engrammer)**

これはシステムの自己改善メカニズムです。「Insight Bloom」エージェントは静的なモデルではなく、Engrammerフレームワークを用いて構築された動的なシステムです 2。「提案 → 共鳴 → 学習」のサイクルで動作し、ユーザーからのフィードバック（明示的および暗黙的）を利用して自身の「プレイブック」を洗練させ、時間とともに関係性の提案品質を向上させます 1。バックエンドでの実装にはLangGraph.jsが採用されており、これは制御可能で状態を持つ操作のグラフ（Graph of Operations）が必要であることを示唆しています 2。LangGraphの選択は、単純な線形チェーンとは異なり、エージェントのロジックが仮説生成、自己評価、ツール利用（11で示唆）、そして最終出力の洗練といった、周期的で複雑なプロセスを含む可能性を示しています。特に、Engrammerは非同期実行、永続的な状態管理（Firestore Checkpointer）、およびHuman-in-the-Loop (HITL) をサポートし、ユーザーとの協調的な思考プロセスを実現します。

#### **構造化I/Oと型安全性**

これはスタック全体で譲れない原則です。すべてのAIモデルの出力は、厳格なJSONスキーマに準拠しなければなりません 2。データベース 3 からバックエンドAPI 11、フロントエンドコンポーネント 16 に至るまで、すべてのデータ構造はTypeScriptとZodスキーマを用いて定義・検証されます 17。これにより、あらゆるインターフェース境界における堅牢性と予測可能性が保証されます。

### **1.3. システムアーキテクチャ概要**

#### **コンポーネント図とデータフロー**

en:gramシステムの全体構成は、フロントエンドSPA、Firebase Cloud Functions、およびGoogle Cloud Servicesの3つの主要コンポーネントから成り立っています 2。データフローは、「ローカルファースト経路」と「クラウドフォールバック経路」、そして「Engrammer非同期処理経路」の三つに大別されます。

```mermaid
graph TD
    A[Frontend SPA (React)] --> B{Firebase Cloud Functions}
    B --> C(Google Cloud Services)
    A -- Local DB (Dexie.js/IndexedDB) --> D[Local Storage]
    B -- Firestore (Engrammer Checkpointer) --> E[Google Cloud Firestore]

    subgraph Frontend
        A
    end

    subgraph Backend
        B
        C
        E
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style C fill:#cfc,stroke:#333,stroke-width:2px
    style D fill:#fcc,stroke:#333,stroke-width:2px
    style E fill:#ffc,stroke:#333,stroke-width:2px

    A -- User Input --> B
    B -- AI Processing --> C
    B -- Engrammer Flow (LangGraph) --> E
    E -- State Persistence --> B
    B -- Results --> A
    D -- Data Sync --> A
```

新しいNoteが作成されると、まずローカルのIndexedDBに永続化されます。その後、バックグラウンド処理がトリガーされ、Embedding生成（通常はクラウド関数経由）と、それに続くInsight生成が行われます。Insight生成は、まずオンデバイスAI（ローカルファースト経路）で試みられ、失敗した場合はクラウドAI（クラウドフォールバック経路）が呼び出されます。生成された繋がり（Relation）は、再びローカルのIndexedDBに保存されます。Engrammerによる複雑な思考プロセスは、Firebase Cloud Functions上でLangGraph.jsとして実行され、その状態はFirestoreに永続化されます。フロントエンドはEngrammerの状態をポーリングし、必要に応じてユーザーの介入（HITL）を促します。

#### **決定版技術スタック**

以下に、本システムの構築に使用される技術スタックを、アーキテクチャ原則との関連性と共に示します 2。

*   **フロントエンド:**
    *   **言語:** TypeScript
    *   **フレームワーク:** React (~18.x)
    *   **ビルドツール:** Vite
    *   **状態管理:** React Hooks (useState, useEffect, useContext)
    *   **ローカルDB:** IndexedDB + Dexie.js (ローカルファースト原則の実装)
    *   **テスト:** Vitest, React Testing Library
    *   **UI:** Material Symbols Outlined (アイコン), React Flow (グラフ可視化、将来実装)
*   **バックエンド (Firebase Cloud Functions):**
    *   **言語:** TypeScript
    *   **ランタイム:** Node.js (v20以上)
    *   **AIフレームワーク:** Firebase Genkit, LangGraph.js (Engrammer実装用)
    *   **デプロイ:** Firebase CLI
*   **AIモデル:**
    *   **オンデバイス:** Gemini Nano (via Chrome Built-in AI API)
    *   **クラウド:** Gemini API (gemini-1.5-flash, gemini-pro, multimodalembeddingなど)

---

## **第 II 部: 環境、ツール、およびデプロイメント**

本セクションは、開発環境のセットアップ、アプリケーションのローカルでの実行、そして本番環境へのデプロイメントに関する完全な運用マニュアルです。主に20で詳述されたガイドに基づいています。

### **2.1. 前提となるソフトウェアとツール**

開発を開始する前に、以下のツールがインストールされ、設定されていることを確認する必要があります 20。

*   **Node.js:** バージョン20以上 (node -vで確認)
*   **npm:** Node.jsに同梱 (npm -vで確認)
*   **Git:** バージョン管理システム (git --versionで確認)
*   **Firebase CLI:** Firebaseツール (firebase --versionで確認)。未インストールの場合は npm install -g firebase-tools を実行し、firebase login で認証を完了させます。
*   **Google Chrome:** 最新の安定版。オンデバイスAIのテストに必須です。

### **2.2. ローカル環境の構成**

#### **プロジェクトのクローンと依存関係のインストール**

以下のコマンドを順に実行し、プロジェクトのセットアップを完了します 20。

1.  リポジトリのクローン:
    git clone <repository-url>
    cd engram-app
2.  フロントエンド依存関係のインストール:
    npm install
3.  バックエンド依存関係のインストール:
    cd functions
    npm install
    cd..

#### **オンデバイスAIのためのブラウザ設定**

ローカルでオンデバイスAI機能をテストするためには、以下のChromeフラグを有効にする必要があります 20。

1.  Chromeのアドレスバーに chrome://flags と入力します。
2.  検索ボックスで #prompt-api-for-gemini-nano を検索します。
3.  表示されたフラグを Enabled に設定します。
4.  ブラウザを再起動します。
5.  (任意) chrome://components にアクセスし、「Optimization Guide On Device Model」がダウンロード済みであることを確認します。

### **2.3. FirebaseおよびGoogle Cloudプロジェクトのセットアップ**

#### **Firebaseプロジェクトの作成と設定**

1.  **プロジェクト作成:** Firebaseコンソールで新規プロジェクトを作成します 23。
2.  **料金プランのアップグレード:** Cloud Functionsが外部API（Gemini APIなど）を呼び出せるようにするため、プロジェクトを**Blaze（従量課金）プランにアップグレードすることが必須**です 20。
3.  **プロジェクトの関連付け:** ローカルディレクトリで firebase use --add を実行し、作成したFirebaseプロジェクトを選択します 20。
4.  **フロントエンド構成:** src/firebase.ts ファイル内の firebaseConfig オブジェクトを、Firebaseコンソールで取得した実際のプロジェクト設定値で更新します 20。
5.  **データベースの初期化:** FirebaseコンソールでFirestoreデータベースを有効化します。これはEngrammerエージェントのプレイブック永続化に必要です 11。

#### **APIキーとシークレット管理**

セキュリティを確保するため、Gemini APIキーはGoogle Cloud Secret Managerを使用して管理します 11。

1.  Google Cloudコンソールで、対象プロジェクトの**Secret Manager APIを有効化**します 24。
2.  GEMINI_API_KEY という名前で新しいシークレットを作成し、値として実際のAPIキーを保存します 26。
3.  Cloud Functionsのデフォルトサービスアカウント（<project-id>@appspot.gserviceaccount.com）に対して、**「Secret Managerのシークレット アクセサー」 (roles/secretmanager.secretAccessor) のIAMロールを付与**します。これにより、デプロイされた関数がコード内にキーをハードコーディングすることなく、安全にAPIキーにアクセスできるようになります 20。

### **2.4. ローカルでの開発とエミュレーション**

ローカルでの開発では、以下の2つのプロセスを別々のターミナルで**同時に**実行する必要があります 20。このワークフローは、ローカル環境と本番環境の差異を最小限に抑えるように設計されており、「私のマシンでは動いた」という問題を削減します。

*   ターミナル 1 (フロントエンド):
    npm run dev
    このコマンドはVite開発サーバーを起動します 27。通常、アプリケーションは http://localhost:5173 でアクセス可能になります。
*   ターミナル 2 (バックエンド):
    firebase emulators:start --only functions,firestore
    このコマンドは、Cloud FunctionsとFirestoreのクラウド環境をローカルでシミュレートします。firebase.tsのコードとAdmin SDKは、エミュレータが実行中であることを自動的に検出し、API呼び出しをクラウドではなくローカルの localhost にルーティングします。デバッグには、http://localhost:4000 でアクセス可能なエミュレータUIを使用できます 20。

### **2.5. テスト、ビルド、デプロイ**

*   テスト:
    npm test
    このコマンドは、Vitest 29 とReact Testing Library 32 を使用して、ユニットテストおよび統合テストを実行します 20。
*   ビルド:
    npm run build
    このコマンドは、dist/ ディレクトリに本番用の静的フロントエンドアセットを生成します 20。
*   デプロイ:
    firebase deploy --only hosting,functions,firestore:rules,secrets
    この単一のコマンドは、アプリケーションスタック全体をデプロイします 20。各フラグの役割は以下の通りです。
    *   hosting: ビルドされたフロントエンド (dist/ ディレクトリ) をデプロイします。
    *   functions: functions/ ディレクトリ内のCloud Functionsをデプロイします。
    *   firestore:rules: Firestoreのセキュリティルールをデプロイします。
    *   secrets: Cloud FunctionsがアクセスするSecret Managerのシークレット設定をデプロイします。

---

## **第 III 部: データおよびバックエンドサービス**

本セクションは、システムのデータ永続化層とサーバーサイドロジックに関する決定的なリファレンスです。データベースとすべてのAPIに関する完全な実装詳細を提供します。

### **3.1. クライアントサイドデータベース仕様 (IndexedDB/Dexie.js)**

#### **採用理由**

本システムでは、ローカルファースト原則に基づき、クライアントサイドデータベースとしてIndexedDBを採用しています。その操作には、開発者フレンドリーでPromiseベースのAPIを提供するDexie.jsライブラリが使用されます 3。

#### **完全なスキーマ実装 (src/db.ts)**

以下に、src/db.tsファイルとして実装されるべき完全なTypeScriptコードを示します。これには、型定義、データベースクラス、スキーマバージョン管理、ヘルパーメソッド、およびフックのすべてが含まれます 3。

```typescript
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// 1. エンティティ (データモデル) 定義
export type NoteType = 'text' | 'image' | 'audio' | 'url' | 'project' | 'task' | 'workshop';
export type NoteStatus = 'active' | 'archived';

export interface WorkshopContent {
  text: string;
  sketchDataUrl?: string;
  imageIds?: string;
  modelIds?: string;
  audioId?: string;
}

export interface Note {
  id: string;
  type: NoteType;
  content: string | Blob;
  createdAt: Date;
  embedding?: number[]; // Changed to number[] for vector embedding
  embeddingStatus: 'pending' | 'completed' | 'failed';
  insightStatus: 'pending' | 'completed' | 'failed';
  projectId?: string | null;
  location?: string | null;
  status: NoteStatus;
  isPinned: boolean;
  tags?: string[]; // Changed to string[] for multiple tags
  isCompleted?: boolean;
  summary?: string;
}

export type RelationSource = 'ai_suggestion' | 'user_manual';
export type RelationFeedback = 'useful' | 'harmful' | 'pending';

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  source: RelationSource;
  reasoning?: string;
  feedback: RelationFeedback;
  createdAt: Date;
  strength?: number;
  userCorrectedReasoning?: string;
}

// 2. Dexie.js データベースクラス定義
class EngramDB extends Dexie {
  notes!: Table<Note>;
  relations!: Table<Relation>;

  constructor() {
    super('EngramDB');
    this.version(5).stores({
      notes: `
        id,
        type,
        createdAt,
        embeddingStatus,
        insightStatus,
        projectId,
        status,
        isPinned,
        location,
        *tags
      `,
      relations: `
        id,
        sourceId,
        targetId,
        [sourceId+targetId],
        source,
        feedback,
        createdAt
      `
    }).upgrade(tx => {
      // version(4)からのマイグレーションロジック
      tx.table('notes').toCollection().modify(note => {
        note.projectId = note.projectId === undefined? null : note.projectId;
        note.location = note.location === undefined? null : note.location;
        note.status = note.status === undefined? 'active' : note.status;
        note.isPinned = note.isPinned === undefined? false : note.isPinned;
        note.tags = note.tags === undefined? [] : note.tags; // Initialize tags as empty array
        note.isCompleted = note.isCompleted === undefined? undefined : note.isCompleted;
        note.summary = note.summary === undefined? undefined : note.summary;
        if (note.embedding !== undefined && typeof note.embedding === 'number') {
          note.embedding = [note.embedding]; // Convert single number to array for backward compatibility
        }
      });
      return tx.table('relations').toCollection().modify(relation => {
        relation.strength = relation.strength === undefined? undefined : relation.strength;
        relation.userCorrectedReasoning = relation.userCorrectedReasoning === undefined? undefined : relation.userCorrectedReasoning;
      });
    });
  }

  // 3. ヘルパーメソッド
  async getPaginatedNotes(offset: number, limit: number, status: NoteStatus = 'active', projectId?: string): Promise<Note[]> {
    let query = this.notes.where('status').equals(status);
    if (projectId) {
      query = query.and(note => note.projectId === projectId);
    }
    return query.orderBy('createdAt').reverse().offset(offset).limit(limit).toArray();
  }

  async countNotes(status: NoteStatus = 'active', projectId?: string): Promise<number> {
    let query = this.notes.where('status').equals(status);
    if (projectId) {
      query = query.and(note => note.projectId === projectId);
    }
    return query.count();
  }

  async getPaginatedRelations(offset: number, limit: number): Promise<Relation[]> {
    return this.relations.orderBy('createdAt').reverse().offset(offset).limit(limit).toArray();
  }

  async countRelationsForNote(noteId: string): Promise<number> {
    return this.relations.where('sourceId').equals(noteId).or('targetId').equals(noteId).count();
  }

  async deleteRelation(id: string): Promise<void> {
    await this.relations.delete(id);
  }

  async updateRelationFeedback(id: string, feedback: RelationFeedback, userCorrectedReasoning?: string): Promise<void> {
    const updateData: Partial<Relation> = { feedback };
    if (userCorrectedReasoning !== undefined) {
      updateData.userCorrectedReasoning = userCorrectedReasoning;
    }
    await this.relations.update(id, updateData);
  }

  async updateNoteStatus(id: string, status: NoteStatus): Promise<void> {
    await this.notes.update(id, { status });
  }

  async updateNotePinnedStatus(id: string, isPinned: boolean): Promise<void> {
    await this.notes.update(id, { isPinned });
  }

  async updateTaskCompletion(id: string, isCompleted: boolean): Promise<void> {
    await this.notes.update(id, { isCompleted });
  }
}

// 4. Dexie Hooks の設定
const db = new EngramDB();

db.notes.hook('creating', (primKey, obj: Note) => {
  if (obj.id === undefined) obj.id = uuidv4();
  if (obj.createdAt === undefined) obj.createdAt = new Date();
  if (obj.status === undefined) obj.status = 'active';
  if (obj.isPinned === undefined) obj.isPinned = false;
  if (obj.embeddingStatus === undefined) obj.embeddingStatus = 'pending';
  if (obj.insightStatus === undefined) obj.insightStatus = 'pending';
  if (obj.tags === undefined) obj.tags = []; // Initialize tags as empty array
});

db.relations.hook('creating', (primKey, obj: Relation) => {
  if (obj.id === undefined) obj.id = uuidv4();
  if (obj.createdAt === undefined) obj.createdAt = new Date();
  if (obj.feedback === undefined) obj.feedback = 'pending';
});

// 5. エクスポート
export default db;

if (import.meta.env.DEV) {
  (window as any).db = db;
}
```

### **3.2. データベーススキーマとアクセスパターン**

前項で定義されたスキーマは、単なるデータストアではなく、アプリケーションの非同期ワークフローをオーケストレーションするための状態機械として機能するように最適化されています。特にNoteテーブルのembeddingStatusとinsightStatusフィールド、およびそれらの複合インデックスは、バックグラウンドのAI処理キューを効率的に実装するためのものです 3。

#### **Noteエンティティスキーマ**

| フィールド名 | TypeScript型 | 説明 | インデックス |
| :---- | :---- | :---- | :---- |
| id | string | 主キー (UUID v4) | Primary |
| type | NoteType | ノート種別 | Yes |
| content | string | Blob | ノート本体 | No |
| createdAt | Date | 作成日時 | Yes |
| embedding | number\[\] | コンテンツのベクトル埋め込み | No |
| embeddingStatus | 'pending' | 'completed' | 'failed' | Embedding生成ステータス（非同期処理キュー用） | Yes |
| insightStatus | 'pending' | 'completed' | 'failed' | 関連性分析ステータス（非同期処理キュー用） | Yes |
| projectId | string | null | 所属プロジェクトID | Yes |
| location | string | null | 作成場所 | Yes |
| status | NoteStatus | ノートの状態 (active | archived) | Yes |
| isPinned | boolean | ピン留め状態 | Yes |
| tags | string\[\] | AIが提案するタグ | Yes (Multi-entry) |
| isCompleted | boolean | タスク完了状態 (type='task') | No |
| summary | string | URLの要約 (type='url') | No |

#### **Relationエンティティスキーマ**

| フィールド名 | TypeScript型 | 説明 | インデックス |
| :---- | :---- | :---- | :---- |
| id | string | 主キー (UUID v4) | Primary |
| sourceId | string | 繋がり元のノートID | Yes |
| targetId | string | 繋がり先のノートID | Yes |
| source | RelationSource | 生成元 (ai_suggestion | user_manual) | Yes |
| reasoning | string | AI/ユーザーによる理由 | No |
| feedback | RelationFeedback | ユーザーからのフィードバック（Engrammer学習用） | Yes |
| createdAt | Date | 作成日時 | Yes |
| strength | number | 繋がりの強度 (0.0 ~ 1.0) | No |
| userCorrectedReasoning | string | ユーザーが修正した理由（Engrammer学習用） | No |

#### **データマイグレーションロジック**

db.ts内の.upgrade()関数 3 は、アプリケーションの旧バージョンを使用しているユーザーのデータベーススキーマを更新するためのロジックを定義します。この関数は、トランザクション内で既存のNoteおよびRelationオブジェクトを走査し、新しく追加されたフィールド（例: projectId, status, strength）にデフォルト値を設定します。これにより、前方互換性が確保されます 35。

### **3.3. サーバーレスバックエンドAPIリファレンス (Firebase Cloud Functions)**

バックエンドは、Firebase Functions 37 をサーバーレスランタイムとして使用し、AIフローのオーケストレーションにはGenkit 40、複雑なEngrammerエージェントの実装にはLangGraph.js 13 を採用しています。すべてのAPIの入出力はZod 17 によって厳格に検証され、フロントエンドとバックエンド間の「スキーマ駆動契約」を形成します。これにより、ネットワーク境界を越えた型安全性が保証されます 11。

#### **Cloud Functions API仕様**

| 関数名 | 説明 | トリガー | 認証 | 入力スキーマ (Zod) | 出力スキーマ (Zod) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| findConnections | オンデバイスAIのクラウドフォールバックとして、ノート間の繋がりを提案する | onCall | 必須 | z.object({ newNote:..., contextNotes: z.array(...).max(10) }) | z.array(z.object({ targetNoteId: z.string(), reasoning: z.string() })) |
| embedNote | ノートのコンテンツ（テキスト/画像）からベクトル埋め込みを生成する | onRequest | 不要 | z.object({ data: { type: z.enum(['text', 'image']), content: z.string() } }) | z.object({ data: z.array(z.number()) }) |
| engrammerFlow_start | Engrammerフローを開始し、初期状態を返す | onCall | 必須 | z.object({ query: z.string() }) | z.object({ thread_id: z.string(), state: z.any() }) |
| getEngrammerState | 指定されたthread_idのEngrammerの状態を取得する | onCall | 必須 | z.object({ thread_id: z.string() }) | z.object({ state: z.any() }) |
| engrammerFlow_continue | Engrammerフローを続行し、ユーザー入力（HITL）を処理する | onCall | 必須 | z.object({ thread_id: z.string(), user_input: z.string() }) | z.object({ thread_id: z.string(), state: z.any() }) |
| engrammerFlow_getNote | Engrammerのプレイブック（Firestore）から特定のノートを取得する | onCall | 必須 | z.object({ noteId: z.string().uuid() }) | z.object({ data: BackendNoteSchema }) |
| summarizeUrl | 指定されたURLのコンテンツを取得し、要約する | onCall | 必須 | z.object({ url: z.string().url() }) | z.object({ summary: z.string() }) |

#### **詳細な関数ロジック**

*   **findConnections**: Genkitフローとして定義され、クライアントサイドのオンデバイスAIと同じプロンプトを使用してGemini Flashモデルを呼び出します。画像ノートの場合はBase64文字列をマルチモーダル入力として処理します 11。
*   **embedNote**: onRequestトリガーであるため、手動でのCORSヘッダー設定が必要です。multimodalembeddingモデルを利用して、テキストまたはBase64画像からベクトルを生成します 11。
*   **engrammerFlow_start**: LangGraphアプリケーションの新しい実行を開始し、初期状態をFirestoreにチェックポイントとして保存します。ユーザーの初期クエリを受け取ります。
*   **getEngrammerState**: クライアントがEngrammerの現在の状態をポーリングするために使用されます。指定された`thread_id`に基づいてFirestoreから状態を読み込み、返します。
*   **engrammerFlow_continue**: Engrammerフローの実行を続行します。特に、Human-in-the-Loop (HITL) の一時停止後にユーザーからの入力（承認、追加情報など）を受け取り、フローを再開するために使用されます。
*   **engrammerFlow_getNote**: Engrammerエージェントが参照したノートがクライアントのローカルDBにない場合に呼び出されるフォールバック関数です。Firestoreに保存されているプレイブックから該当ノートを取得し、クライアントに返します 11。
*   **summarizeUrl**: Genkitフローとして定義され、指定されたURLのHTMLを取得し、本文を抽出してからGeminiモデルで要約を生成する、という一連の処理をカプセル化します 11。

---

## **第 IV 部: フロントエンドアプリケーションの実装**

本セクションでは、ユーザーが直接対話するシングルページアプリケーションの構築について、アーキテクチャから個々のUIコンポーネントの実装に至るまでを詳述します。

### **4.1. フロントエンドアーキテクチャと状態管理**

#### **コア技術**

フロントエンドは、React（TypeScript使用）をViteでビルドする構成です 2。

#### **コンポーネント階層**

アプリケーションのルートはApp.tsxであり、これが全体のレイアウトと状態管理のオーケストレーターとして機能します。具体的な画面はpages/ディレクトリ内のコンポーネントが、再利用可能なUI部品はcomponents/ディレクトリ内のコンポーネントが担当します 16。

```
src/
├── App.tsx             # ルート、状態管理、ルーティング
├── pages/
│   ├── MainPage.tsx    # ホーム画面 (ノート入力 + Engrammer対話)
│   └── NotesPage.tsx   # ノート一覧画面
└── components/
    ├── AppHeader.tsx   # ヘッダー
    ├── SideNav.tsx     # サイドナビゲーション
    └── NoteCard.tsx    # ノート表示カード
```

#### **状態管理戦略**

状態管理は「App.tsxをオーケストレーターとする」モデルを採用し、意図的に単純化されています 16。

*   **グローバルUI状態:** 現在のビュー（view）、テーマ（theme）、AI処理中フラグ（isAiWorking）など、アプリケーション全体に関わるUIの状態はApp.tsx内でuseStateとuseContextを用いて管理されます。
*   **データ状態 (DBから):** Dexie.jsのuseLiveQueryフックが全面的に採用されます。これはリアクティブなアプローチであり、UIコンポーネントはデータベースのクエリ結果を購読します。基礎となるデータが変更されると、コンポーネントは自動的に再レンダリングされます。これにより、手動でのデータフェッチ、キャッシュ管理、状態同期の複雑さが大幅に削減されます 6。
*   **ローカルコンポーネント状態:** 個々のコンポーネント内でのみ使用される状態（例: 入力フォームの値）は、そのコンポーネント内でuseStateを用いて管理されます。

#### **ルーティングとナビゲーション**

従来のURLベースのルーティングではなく、App.tsxのview状態変数に基づいたシンプルなビュー切り替えシステムを採用しています。handleNavigate関数がview状態を更新することで、表示されるページコンポーネントが切り替わります 16。

### **4.2. ビジュアルデザインシステムとグローバルスタイリング (index.css)**

#### **デザイン原則**

デザインの指針は「幻想的、シンプル、ミニマル、品のある」であり、ユーザーの思考を妨げない、落ち着いたインターフェースを目指します 16。

#### **Glassmorphismの実装**

主要なUI効果である「すりガラス（Glassmorphism）」は、.glass-cardという共通ユーティリティクラスによって実装されます。この視覚効果は、個々のノートの表面を「透かし見る」ことで、その背後にある繋がりを示唆するという、アプリケーションのコアコンセプトを機能的に表現するメタファーとしての役割も担っています 1。

```css
.glass-card {
  background-color: var(--glass-background-color);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

#### **テーマ設定 (Light/Darkモード)**

テーマはCSSカスタムプロパティ（変数）を用いて実装されます。:rootセレクタでライトモードの変数を定義し、body.dark-themeセレクタでダークモード用の値を上書きします 46。

| 変数名 | ライトモードの値 | ダークモードの値 | 説明 |
| :---- | :---- | :---- | :---- |
| --background-color | #f8f9fa | #121212 | ページ全体の背景色 |
| --glass-background-color | rgba(255, 255, 255, 0.6) | rgba(40, 40, 40, 0.7) | すりガラス要素の背景色 |
| --text-color-primary | #212529 | #e9ecef | 主要なテキスト色 |
| --text-color-secondary | #6c757d | #adb5bd | 副次的なテキスト色 |
| --border-color | rgba(255, 255, 255, 0.8) | rgba(60, 60, 60, 0.8) | すりガラス要素の境界線色 |
| --accent-color | #007bff | #007bff | 主要なアクセントカラー |

#### **タイポグラフィとアイコン**

フォントは可読性の高いサンセリフ体「Inter」を使用し、アイコンは「Material Symbols Outlined」で一貫して統一されます 2。

### **4.3. UIコンポーネント実装ガイド**

各コンポーネントは、その目的、受け取るPropsのインターフェース、JSX構造、およびスタイリングの観点から定義されます 16。

*   **App.tsx (レイアウトシェル):** アプリケーション全体の骨格を定義し、AppHeader、SideNav、およびメインコンテンツエリアを配置します。
*   **AppHeader.tsx / SideNav.tsx:** アプリケーションの主要なナビゲーション要素。両コンポーネントには.glass-cardスタイルが適用され、統一感のある外観を提供します。
*   **NoteInput.tsx:** テキスト、画像、音声など、マルチモーダルな入力を受け付けるフォームコンポーネントです。
*   **NoteCard.tsx:** 個々のノートを表示するためのカードコンポーネント。.glass-cardスタイルを適用し、グリッド表示とリスト表示の両モードに対応します。
*   **GraphView.tsx:** ノートと繋がりの関係性を視覚化するためのコンポーネント（将来実装）。React Flowライブラリ 49 を使用し、ノードとエッジには.glass-cardスタイルを適用したカスタムコンポーネントを定義します 46。
*   **MainPage.tsx (Engrammer対話エリア):** Engrammerエージェントとの対話インターフェース。AIが応答を生成している間（isEngrammerWorkingがtrue）、InsightBloomAnimationコンポーネントをオーバーレイ表示し、処理中であることを視覚的に伝えます 46。
*   **各種モーダル:** テーマ選択、ワークショップノート入力、オンボーディングなど、特定の機能を提供するモーダルウィンドウ群も、一貫して.glass-cardスタイルを適用します。

---

## **第 V 部: 人工知能システムの実装**

本セクションは、en:gramシステムの「頭脳」にあたるすべてのAI関連ロジックのアルゴリズムと実装詳細を提供します。このAIシステムは、プライバシー、パフォーマンス、能力、パーソナライゼーションという競合する要件をバランスさせるために、複数の階層で構成されています。

### **5.1. クライアントサイド・ハイブリッドAIエンジン (getInsightSuggestions)**

この関数は、新しいノートが追加された際に、既存のノートとの繋がりを発見する中核的なロジックです 7。

#### **アルゴリズムフロー**

1.  **コンテキスト構築:**
    *   DBからEmbeddingが完了しているすべての既存ノートを取得します。
    *   findSimilarNotes関数（内部でコサイン類似度を計算）を呼び出し、新しいノートと意味的に最も類似する上位5件のノートを「コンテキスト」として選択します 7。
2.  **プロンプトエンジニアリング:** オンデバイスAIとクラウドAIで共通のシステムプロンプトが使用されます。このプロンプトは、AIの役割、タスク（表面的でない繋がりを最大3件発見）、禁止事項（単純なキーワードマッチングの回避）、そして厳格なJSON配列形式での出力を指示します 7。
3.  **オンデバイス実行 (window.ai):**
    *   まず、window.LanguageModel APIの存在と、LanguageModel.availability()を呼び出してモデルの利用可能性を確認します 7。
    *   LanguageModel.create()でセッションを作成し、session.prompt()でプロンプトを実行します 8。
    *   返されたJSON文字列をパースし、構造化されたデータに変換します。
4.  **クラウドフォールバック実行:**
    *   オンデバイス実行が失敗した場合、catchブロックで処理が続行されます。
    *   画像ノートのBlobオブジェクトは、blobToBase64ヘルパー関数を用いてBase64文字列にエンコードされます 7。
    *   エンコードされたデータを含むリクエストペイロードが、FirebaseのfindConnectionsCloud関数に送信されます 7。
5.  **データ永続化:**
    *   いずれの経路で得られた提案も、saveSuggestions関数によってdb.relations.bulkAddメソッドを用いて効率的にローカルのIndexedDBにRelationオブジェクトとして一括保存されます 3。

この第1層（オンデバイス）と第2層（クラウド）のAIは、それぞれ「戦術的/高速」および「戦略的/高機能」な役割を担います。オンデバイスAIは速度とプライバシーを優先し、クラウドAIは能力とアクセシビリティを優先します。

### **5.2. 非同期AIバックグラウンドワーカー**

AI関連の重い処理は、UIの応答性を妨げないよう、バックグラウンドワーカーとして実装されます。これらのワーカーは、データベースのステータスフィールドを監視する状態機械として機能します 7。

*   **Embeddingワーカー:**
    *   useLiveQueryを用いて、embeddingStatus: 'pending'のノートを監視します。
    *   対象のノートを見つけると、embedNoteクラウド関数を呼び出してEmbeddingを生成します。
    *   処理が完了すると、ノートのステータスをembeddingStatus: 'completed'およびinsightStatus: 'pending'に更新します。失敗した場合はembeddingStatus: 'failed'に更新します 7。
*   **Insightワーカー:**
    *   useLiveQueryを用いて、embeddingStatus: 'completed'かつinsightStatus: 'pending'のノートを監視します。
    *   isAiWorkingフラグをミューテックスとして使用し、複数のAI処理が同時に実行されるのを防ぎます。
    *   対象のノートを見つけると、getInsightSuggestions関数を呼び出して繋がりの分析を実行します。
    *   処理が完了または失敗すると、ノートのinsightStatusをそれぞれcompletedまたはfailedに更新します 7。

### **5.3. Engrammerエージェントの統合とフィードバックループ**

第3のAI層であるEngrammerエージェントは「メタ/学習」層として機能します。これは単一のクエリに答えるだけでなく、他のAI層の結果とそれに対するユーザーのフィードバックを長期的に観察し、将来の対話のためのより良いコンテキストを提供するように学習します。

#### **クライアントサイドの連携ロジック**

*   **Engrammerフロー開始 (startEngrammerFlow):**
    1.  `isEngrammerWorking`ローディング状態を`true`に設定します。
    2.  ユーザーの初期クエリを受け取り、Firebaseの`engrammerFlow_start`関数を呼び出します。
    3.  返された`thread_id`と初期状態を管理し、Engrammerの非同期処理を開始します。
*   **Engrammerフロー続行 (continueEngrammerFlow):**
    1.  `isEngrammerWorking`ローディング状態を`true`に設定します。
    2.  現在の`thread_id`とユーザー入力（HITLからの応答など）をFirebaseの`engrammerFlow_continue`関数に送信します。
    3.  Engrammerの新しい状態を受け取り、UIを更新します。
*   **Engrammer状態ポーリング (pollEngrammerState):**
    1.  定期的にFirebaseの`getEngrammerState`関数を呼び出し、Engrammerの現在の状態を`thread_id`に基づいて取得します。
    2.  状態の変化（特にHITLの要求やフローの完了）を検出し、UIに反映させます。
*   **参照ノートの取得 (handleFeedbackClick):**
    Engrammerエージェントが応答内で参照したノートを表示するためのロジックです。ローカルファースト原則に従い、まずローカルのIndexedDB (`db.notes.get(noteId)`) を検索し、見つからない場合にのみクラウドの`engrammerFlow_getNote`関数にフォールバックします 12。

#### **フィードバックメカニズムと自己改善サイクル**

このシステム全体の設計は、ユーザーのインタラクションが直接AIの改善につながる「好循環（Virtuous Cycle）」を形成します。

1.  ユーザーがNoteを作成します 3。
2.  AI（オンデバイスまたはクラウド）がRelationを提案します 7。
3.  ユーザーがそのRelationに対してfeedback（例: usefulと評価）を提供するか、userCorrectedReasoningを追記します 3。
4.  このフィードバックデータは、Engrammerエージェントの学習サイクルへの入力となります 1。
5.  Engrammerエージェントは、このフィードバックを基に内部のplaybook（Firestoreに保存）を更新します 11。
6.  更新されたplaybookは、将来のRelation提案の質を向上させます。

この閉ループシステムにより、ユーザーがen:gramを使い込むほど、AIの洞察はよりパーソナライズされ、価値が高まります。これは強力なリテンションメカニズムであると同時に、各ユーザーに固有の、模倣困難な競争上の優位性を構築します。

#### **引用文献**

1.  en:gram（縁グラム）設計概要
2.  1.システム概要とアーキテクチャ設計書
3.  2.データベース設計書
4.  Dexie Constructor - Dexie.js, 10月 29, 2025にアクセス、 [https://dexie.org/docs/Dexie/Dexie](https://dexie.org/docs/Dexie/Dexie)
5.  API Reference - Dexie.js, 10月 29, 2025にアクセス、 [https://dexie.org/docs/API-Reference](https://dexie.org/docs/API-Reference)
6.  Dexie.js - Minimalistic IndexedDB Wrapper, 10月 29, 2025にアクセス、 [https://dexie.org/](https://dexie.org/)
7.  5.クライアントサイドAIロジック設計書
8.  Built-in AI APIs | AI on Chrome | Chrome for Developers, 10月 29, 2025にアクセス、 [https://developer.chrome.com/docs/ai/built-in-apis](https://developer.chrome.com/docs/ai/built-in-apis)
9.  Built-in AI | AI on Chrome - Chrome for Developers, 10月 29, 2025にアクセス、 [https://developer.chrome.com/docs/ai/built-in](https://developer.chrome.com/docs/ai/built-in)
10. Practical built-in AI with Gemini Nano in Chrome - YouTube, 10月 29, 2025にアクセス、 [https://www.youtube.com/watch?v=CjpZCWYrSxM](https://www.youtube.com/watch?v=CjpZCWYrSxM)
11. 7.バックエンドAPI設計書
12. 6.Engrammer（ACE）連携設計書の説明
13. Home - Docs by LangChain, 10月 29, 2025にアクセス、 [https://docs.langchain.com/](https://docs.langchain.com/)
14. LangGraph.js API Reference - GitHub Pages, 10月 29, 2025にアクセス、 [https://langchain-ai.github.io/langgraphjs/reference/](https://langchain-ai.github.io/langgraphjs/reference/)
15. LangChain.js, 10月 29, 2025にアクセス、 [https://js.langchain.com/docs/introduction/](https://js.langchain.com/docs/introduction/)
16. 3.フロントエンド基本設計書
17. Zod Tutorial - Total TypeScript, 10月 29, 2025にアクセス、 [https://www.totaltypescript.com/tutorials/zod](https://www.totaltypescript.com/tutorials/zod)
18. Aakanksha011/zod: Zod is a TypeScript-first schema ... - GitHub, 10月 29, 2025にアクセス、 [https://github.com/Aakanksha011/zod](https://github.com/Aakanksha011/zod)
19. Exploring Zod: A Comprehensive Guide - DEV Community, 10月 29, 2025にアクセス、 [https://dev.to/debajit13/exploring-zod-a-comprehensive-guide-1efn](https://dev.to/debajit13/exploring-zod-a-comprehensive-guide-1efn)
20. 8.en:gram 開発・実行環境設定ガイド
21. Get started with built-in AI | AI on Chrome, 10月 29, 2025にアクセス、 [https://developer.chrome.com/docs/ai/get-started](https://developer.chrome.com/docs/ai/get-started)
22. Creating a React Hook for Chrome's window.ai model, 10月 29, 2025にアクセス、 [https://rebeccamdeprey.com/blog/a-react-hook-for-windowai-in-chrome](https://rebeccamdeprey.com/blog/a-react-hook-for-windowai-in-chrome)
23. Firebase Console - Google, 10月 29, 2025にアクセス、 [https://console.firebase.google.com/](https://console.firebase.google.com/)
24. Secret Manager | Google Cloud, 10月 29, 2025にアクセス、 [https://cloud.google.com/security/products/secret-manager](https://cloud.google.com/security/products/secret-manager)
25. Secret Manager documentation | Google Cloud Documentation, 10月 29, 2025にアクセス、 [https://docs.cloud.google.com/secret-manager/docs](https://docs.cloud.google.com/secret-manager/docs)
26. Create a secret | Secret Manager - Google Cloud, 10月 29, 2025にアクセス、 [https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets](https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets)
27. Vite | WebStorm Documentation - JetBrains, 10月 29, 2025にアクセス、 [https://www.jetbrains.com/help/webstorm/vite.html](https://www.jetbrains.com/help/webstorm/vite.html)
28. Getting Started - Vite, 10月 29, 2025にアクセス、 [https://v3.vitejs.dev/guide/](https://v3.vitejs.dev/guide/)
29. Expect - Vitest, 10月 29, 2025にアクセス、 [https://vitest.dev/api/expect](https://vitest.dev/api/expect)
30. Configuring Vitest, 10月 29, 2025にアクセス、 [https://vitest.dev/config/](https://vitest.dev/config/)
31. Vi | Vitest, 10月 29, 2025にアクセス、 [https://vitest.dev/api/vi](https://vitest.dev/api/vi)
32. Documentation - React Test, 10月 29, 2025にアクセス、 [https://react-test.dev/documentation](https://react-test.dev/documentation)
33. Testing Overview - React, 10月 29, 2025にアクセス、 [https://legacy.reactjs.org/docs/testing.html](https://legacy.reactjs.org/docs/testing.html)
34. testing-library/react-testing-library: Simple and complete React DOM testing utilities that encourage good testing practices. - GitHub, 10月 29, 2025にアクセス、 [https://github.com/testing-library/react-testing-library](https://github.com/testing-library/react-testing-library)
35. Version.upgrade() - Dexie.js, 10月 29, 2025にアクセス、 [https://dexie.org/docs/Version/Version.upgrade()](https://dexie.org/docs/Version/Version.upgrade()))
36. Version - Dexie.js, 10月 29, 2025にアクセス、 [https://dexie.org/docs/Version/Version](https://dexie.org/docs/Version/Version)
37. Firebase Documentation, 10月 29, 2025にアクセス、 [https://firebase.google.com/docs](https://firebase.google.com/docs)
38. Cloud Run functions, 10月 29, 2025にアクセス、 [https://cloud.google.com/functions](https://cloud.google.com/functions)
39. Functions - Firebase Modular JavaScript SDK Documentation, 10月 29, 2025にアクセス、 [https://modularfirebase.web.app/reference/functions/](https://modularfirebase.web.app/reference/functions/)
40. Genkit | Firebase, 10月 29, 2025にアクセス、 [https://firebase.google.com/docs/genkit/overview](https://firebase.google.com/docs/genkit/overview)
41. Firebase Genkit - Qdrant, 10月 29, 2025にアクセス、 [https://qdrant.tech/documentation/frameworks/genkit/](https://qdrant.tech/documentation/frameworks/genkit/)
42. Announcing the Genkit Extension for Gemini CLI - Google for Developers Blog, 10月 29, 2025にアクセス、 [https://developers.googleblog.com/en/announcing-the-genkit-extension-for-gemini-cli/](https://developers.googleblog.com/en/announcing-the-genkit-extension-for-gemini-cli/)
43. Tool calling | Genkit - Firebase - Google, 10月 29, 2025にアクセス、 [https://firebase.google.com/docs/genkit/tool-calling](https://firebase.google.com/docs/genkit/tool-calling)
44. LangGraph persistence - GitHub Pages, 10月 29, 2025にアクセス、 [https://langchain-ai.github.io/langgraph/concepts/persistence/](https://langchain-ai.github.io/langgraph/concepts/persistence/)
45. Built with LangGraph! #17: Checkpoints | by Okan Yenigün | Towards Dev - Medium, 10月 29, 2025にアクセス、 [https://medium.com/@okanyenigun/built-with-langgraph-17-checkpoints-2d1d54e1464b](https://medium.com/@okanyenigun/built-with-langgraph-17-checkpoints-2d1d54e1464b)
46. 4.主要UIコンポーネント詳細設計書
47. Icons – Material Design 3, 10月 29, 2025にアクセス、 [https://m3.material.io/styles/icons/designing-icons](https://m3.material.io/styles/icons/designing-icons)
48. Material Symbols and Icons - Google Fonts, 10月 29, 2025にアクセス、 [https://fonts.google.com/icons](https://fonts.google.com/icons)
49. React Flow: Node-Based UIs in React, 10月 29, 2025にアクセス、 [https://reactflow.dev/](https://reactflow.dev/)
50. reactflow - NPM, 10月 29, 2025にアクセス、 [https://www.npmjs.com/package/reactflow](https://www.npmjs.com/package/reactflow)
