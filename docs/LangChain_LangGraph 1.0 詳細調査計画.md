

# **LangChain & LangGraph 1.0 技術的詳細解説：アーキテクチャ、機能、および実装**

---

### **第I部：バージョン1.0のビジョンとアーキテクチャの進化**

#### **1\. はじめに：安定性と本番環境対応へのコミットメント**

##### **1.1 「0.x時代」の課題への対応**

LangChainとLangGraphのバージョン1.0のリリースは、単なるバージョンアップではなく、フレームワークの成熟と安定性への強いコミットメントを示すものです。バージョン0.xの時代、開発者コミュニティはいくつかの重要な課題に直面していました。頻繁な破壊的変更は、アプリケーションのメンテナンスコストを増大させ、アップデートに対する不安を生み出していました 1。また、フレームワークが進化するにつれてパッケージは肥大化し、どのコンポーネントが本番環境で安定して利用できるのかが不明確でした 2。さらに、事前構築されたパターンから少しでも逸脱したユースケースに対応しようとすると、カスタマイズが困難であるというフィードバックも多く寄せられていました 1。

これらの課題に真摯に対応するため、バージョン1.0では、バージョン2.0まで破壊的変更を行わないという安定性への明確な保証が打ち出されました 1。この保証は、特にエンタープライズレベルでの採用において、技術選定の重要な判断材料となります。

##### **1.2 バージョン1.0の基本理念：アプリケーションのためのLangChainとオーケストレーションのためのLangGraphの明確な分離**

バージョン1.0における最も重要な戦略的変更は、LangChainとLangGraphの役割を明確に分離したことです。この二つのフレームワークは、異なる目的のために設計されています 1。

**LangChain 1.0**は、標準的なエージェントを迅速に構築するための高レベルな「ファストパス」として位置づけられています 1。開発者のエルゴノミクスと迅速な製品化を最優先に設計されており、複雑さを抽象化することで、開発者はアプリケーションのロジックに集中できます 6。

一方、**LangGraph 1.0**は、複雑でステートフル、かつ長期間実行されるワークフローをオーケストレーションするための低レベルで耐久性のあるランタイムとしての地位を確立しました 6。これには、ヒューマンインザループ（Human-in-the-Loop）を必要とするプロセスも含まれます 8。この明確な役割分担は、以前のバージョンで存在した曖昧さを解消します。以前は、単純なシングルエージェントシステムであっても、信頼性を確保するためにLangGraphを利用せざるを得ないケースが多く見られました 12。

##### **1.3 アーキテクチャの全面的な見直し：langchain-core、langchain、langchain-classicへのパッケージ分割**

バージョン1.0では、パッケージ構造が全面的に見直され、よりモジュール化されたアーキテクチャが採用されました。このリファクタリングは、単なるコード整理以上の戦略的な意味を持っています。

* **langchain-core**: モデル、メッセージ、ツールといった中核となる抽象化とインターフェースがこのパッケージに集約されました。langchain-coreは、Standard Content Blocksの追加を除き、最小限の変更でバージョン1.0に昇格しており、エコシステムの安定した基盤として機能します 1。  
* **langchain**: メインパッケージであるlangchainは、新しいエージェント構築パラダイムに特化してスリム化されました。具体的には、create\_agent関数とミドルウェアシステムが中心的な機能となります 1。  
* **langchain-classic**: LLMChainのようなレガシーなチェーン、古いAgentExecutor、その他の非推奨となった機能は、後方互換性を確保するためにlangchain-classicという別のパッケージに移動されました 1。これにより、主要な名前空間が整理され、フレームワークの意図された利用パターンが明確になりました。

このパッケージ分割は、LangChainがモノリシックなライブラリから、成熟した階層的なソフトウェアスタックへと進化したことを示しています。ウェブフレームワークがコアエンジン、ミドルウェア層、アプリケーション層に分かれているのと同様に、このアーキテクチャは異なる開発者ペルソナに対応します。ライブラリの統合者はlangchain-coreを、システムアーキテクトはlanggraphを、そしてアプリケーション開発者はlangchainを利用することが想定されています。この構造は、開発者がシンプルなアプリケーションから始めて、必要に応じて複雑なオーケストレーションへとスムーズに移行できる「段階的な複雑さへの道筋」を提供します。これは、成熟し、よく設計されたフレームワークの証と言えるでしょう。

---

### **第II部：LangChain 1.0 \- エージェント開発への高レベルなアプローチ**

#### **2\. create\_agent抽象化：新たな基盤**

##### **2.1 AgentExecutorとcreate\_react\_agentから統一されたエントリーポイントへ**

LangChain 1.0では、エージェントの作成方法が根本的に見直されました。従来のアプローチであったAgentクラスやAgentExecutor、そしてlanggraph.prebuilt.create\_react\_agentは非推奨となり、新たにlangchain.agents.create\_agentが標準的かつ唯一の方法として導入されました 1。この変更により、開発者は単一の直感的な関数を通じてエージェントを構築できるようになり、開発者体験が大幅に向上しました 12。

##### **2.2 内部構造：LangGraphランタイム**

create\_agentの最も重要な特徴は、その基盤がLangGraphランタイム上に直接構築されている点です 1。このアーキテクチャにより、create\_agentで作成されたすべてのエージェントは、LangGraphが提供する強力な機能を「標準で」利用できます。具体的には、チェックポイントを利用した永続化による耐久性のある実行、ストリーミング、ヒューマンインザループ機能、そしてタイムトラベルデバッグなどが含まれます 5。これは、これらの機能を手動で複雑に統合する必要があったバージョン0.xの時代からの根本的な進歩です。

##### **2.3 実装ガイド：API、設定、および呼び出し**

create\_agentを実装レベルで理解するために、その具体的な使用方法を以下に示します。

* **APIシグネチャ**: create\_agent関数は、エージェントの振る舞いを定義するための主要なパラメータを受け取ります。  
  Python  
  from langchain.agents import create\_agent  
  from langchain\_openai import ChatOpenAI  
  from langchain.tools import tool

  @tool  
  def get\_weather(location: str) \-\> str:  
      """指定された場所の天気を取得します。"""  
      return f"{location}の天気は晴れです。"

  tools \= \[get\_weather\]  
  model \= ChatOpenAI(model="gpt-4o")

  agent \= create\_agent(  
      model=model,  
      tools=tools,  
      system\_prompt="あなたは役立つアシスタントです。"  
  )

  主要なパラメータには、model、tools、system\_prompt、middleware、state\_schemaなどがあります 15。  
* **モデル設定**: モデルは、"openai:gpt-4o"のような文字列で静的に指定することも、ChatOpenAI(model="gpt-4o", temperature=0)のように設定済みのモデルインスタンスを渡すことで動的に指定することも可能です 17。  
* **ツール定義とバインディング**: ツールは@toolデコレータを使用して簡単に定義し、リストとしてtoolsパラメータに渡すことができます 15。  
* **システムプロンプト**: 静的なシステムプロンプトはsystem\_promptパラメータに文字列として渡します。動的なプロンプトが必要な場合は、後述するミドルウェアを使用する新しいパターンが推奨されます 15。  
* **呼び出しと状態**: エージェントの呼び出しは、agent.invoke({"messages": \[...\]})という標準的な形式で行います。エージェントの状態は内部で暗黙的に管理されます 17。  
  Python  
  result \= agent.invoke({  
      "messages": \[{"role": "user", "content": "東京の天気は？"}\]  
  })  
  print(result\['messages'\]\[-1\].content)

* **カスタム状態**: エージェントのデフォルト状態を拡張するには二つの方法があります。一つはstate\_schemaパラメータを使用する方法で、この場合スキーマはTypedDictに限定されます。もう一つは、より推奨される方法で、ミドルウェア内で状態を定義し管理する方法です 15。

#### **3\. ミドルウェア：カスタマイズと制御のエンジン**

##### **3.1 概念的フレームワーク：エージェントループへの介入**

ミドルウェアは、LangChain 1.0におけるカスタマイズのための中心的なイノベーションです 4。エージェントのコアとなるループ（モデル呼び出し → ツール呼び出し → 繰り返し）1 に対して、ミドルウェアはbefore\_model、after\_model、wrap\_model\_call、wrap\_tool\_callといったライフサイクルフックを提供し、プロセスの各段階に介入することを可能にします 16。このアーキテクチャはウェブフレームワークのミドルウェアに類似しており、多くの開発者にとって直感的です 21。これは、柔軟性に欠けるコールバックシステムや複雑なサブクラス化を必要とした旧バージョンからの大きな改善点です。

##### **3.2 組み込みミドルウェアの詳細分析**

LangChain 1.0には、一般的なユースケースに対応するための強力な組み込みミドルウェアがいくつか用意されています。以下の表は、主要なミドルウェアの概要と設定オプションをまとめたものです。

| ミドルウェアクラス | 主な目的 | 主要な設定パラメータ | ユースケース例 |
| :---- | :---- | :---- | :---- |
| SummarizationMiddleware | コンテキストウィンドウサイズの管理 | model, max\_tokens\_before\_summary, messages\_to\_keep | トークン制限を超えずに会話全体を記憶する必要がある長時間のチャットボット。 |
| HumanInTheLoopMiddleware | 人間の承認のための実行一時停止 | interrupt\_on, checkpointer (必須) | メール送信や金融取引など、人間の承認が必要なエージェント。 |
| PIIMiddleware | 機密データの検出と処理 | pii\_type, strategy (redact, mask 等), detector | ユーザーの個人識別情報（PII）をログに記録したり処理したりしてはならないカスタマーサポートエージェント。 |
| ModelCallLimitMiddleware | LLM呼び出し回数の制限 | run\_limit, thread\_limit, exit\_behavior | 設定ミスによるエージェントの再帰ループでの高額なコスト発生を防止。 |
| ToolCallLimitMiddleware | ツール使用回数の制限 | tool\_name, run\_limit, thread\_limit | 高価なサードパーティAPIへの呼び出しをレート制限。 |
| ToolRetryMiddleware | ツール失敗に対する回復力の追加 | max\_retries, retry\_on, on\_error | 不安定なネットワークAPIに依存し、一時的なエラー時にリトライが必要なエージェント。 |

これらのミドルウェアを組み合わせることで、堅牢で安全、かつコスト効率の高いエージェントを構築できます 1。

##### **3.3 実践的実装：カスタムミドルウェアの作成**

特定の要件を満たすために、独自のミドルウェアを作成することも可能です。

* **デコレータベースのアプローチ**: 単一のフックを持つシンプルなミドルウェアには、@before\_modelや@wrap\_tool\_callのようなデコレータを使用するのが最も手軽です 21。  
  Python  
  from langchain.agents.middleware import before\_model, AgentState

  @before\_model  
  def log\_message\_count(state: AgentState) \-\> None:  
      print(f"モデル呼び出し前：メッセージ数 \= {len(state\['messages'\])}")

* **クラスベースのアプローチ**: 独自の状態、設定、複数のフックを必要とする複雑なミドルウェアは、AgentMiddlewareをサブクラス化して作成します 21。

このミドルウェアシステムは、単なるカスタマイズ機能以上の意味を持ちます。Supervisor、Swarm、Reflectionといった、以前は個別のLangGraph実装を必要とした複雑なエージェントアーキテクチャが、今やミドルウェアの組み合わせとして再現可能であると示唆されています 20。これは、開発者が固定されたエージェントの「型」を選ぶのではなく、基本的な振る舞い（ミドルウェア）を「構成」することでエージェントを設計するという、より強力なパラダイムへの移行を意味します。このアプローチは、フレームワークを単なる実装のコレクションから、カーネル（エージェントループ）とロード可能なモジュール（ミドルウェア）を持つ真の「エージェントオペレーティングシステム」へと昇華させます。

#### **4\. Standard Content Blocks：LLMのための共通言語**

##### **4.1 プロバイダー間の差異の解消**

現代のLLMは、単なるテキストだけでなく、思考プロセス（reasoning traces）、引用、サーバーサイドでのツール呼び出しといった、リッチで構造化された出力を返す能力を持っています。しかし、これらの出力形式はプロバイダーごとに異なり、互換性がありませんでした 24。この問題は、モデル非依存というLangChainの核となる価値提案を脅かすものでした 7。Standard Content Blocksは、この問題を解決するために導入されました。

##### **4.2 content\_blocksプロパティ**

バージョン1.0では、すべてのメッセージオブジェクトに新しい.content\_blocksプロパティが追加されました 1。これは、生のメッセージコンテンツから遅延的に解析される型付けされた辞書のリストであり、完全な後方互換性を維持しています 14。このプロパティを通じて、開発者はモデルプロバイダーの違いを意識することなく、構造化された情報にアクセスできます。

##### **4.3 サポートされる型と実装**

content\_blocksは、以下のような標準化された型をサポートします 24。

* TextContentBlock: 通常のテキスト出力  
* ReasoningContentBlock: モデルの思考プロセス  
* ToolCall: モデルによるツール呼び出し  
* ImageContentBlock, AudioContentBlock: マルチモーダルデータ

例えば、Anthropicモデルからの応答に含まれる引用情報も、OpenAIモデルからの応答に含まれる引用情報も、同じCitationContentBlock（仮）としてアクセスできるため、プロバイダーに依存しない堅牢なアプリケーションを構築できます 4。

#### **5\. LangChain 1.0の高度な機能**

##### **5.1 合理化された構造化出力**

バージョン1.0では、構造化出力の生成がメインのエージェントループに直接統合されました。これにより、従来しばしば必要とされた追加のLLM呼び出しが不要になり、レイテンシとコストの両方が削減されます 1。ToolStrategyとProviderStrategyを使用することで、生成戦略をきめ細かく制御できます 15。

##### **5.2 LangChainにおけるマルチエージェントシステム**

新しいフレームワークは、マルチエージェントのオーケストレーションも簡素化します。基本的なユースケースであれば、あるエージェントを別のエージェントのツールとして公開することで、LangChain内で直接マルチエージェントシステムを定義できます。これにより、単純な階層的タスクのために、別途複雑なオーケストレーション層を構築する必要がなくなりました 12。

---

### **第III部：LangGraph 1.0 \- 耐久性のあるオーケストレーションのための低レベルフレームワーク**

#### **6\. コアコンセプト：状態、ノード、エッジによる構築**

##### **6.1 StateGraphパラダイム**

LangGraphは、ステートマシンフレームワークとして機能します 27。開発の中心となるのはStateGraphで、グラフの共有メモリであるStateスキーマ（通常はTypedDictで定義）を最初に定義します 27。状態は生のデータを保持し、プロンプトのフォーマットなどはノード内で行うという原則が重要です 29。

##### **6.2 機能単位としてのノード**

ノードは、グラフ内の個々の処理ステップを表すPython関数またはその他の呼び出し可能オブジェクトです。ノードは現在の状態を入力として受け取り、何らかの処理を実行して、状態の更新を返します 27。

##### **6.3 制御フローとしてのエッジ**

エッジはノード間を接続し、ワークフローの制御フローを定義します。

* **静的エッジ**: add\_edgeを使用して、あるノードから次のノードへの無条件の遷移を定義します 27。  
* **条件付きエッジ**: add\_conditional\_edgesを使用して、現在の状態に基づいて次に実行するノードを決定するルーティングロジックを実装します。これがエージェント的な振る舞いの核となります 27。

##### **6.4 実装チュートリアル：ステートフルなグラフの構築**

以下は、LangGraphアプリケーションを構築する基本的なステップです 27。

1. **状態の定義**: TypedDictを使用してグラフの状態スキーマを定義します。  
   Python  
   from typing import TypedDict, Annotated  
   from langgraph.graph.message import add\_messages

   class State(TypedDict):  
       messages: Annotated\[list, add\_messages\]

2. **ノードの定義**: 各ステップを関数として実装します。  
   Python  
   def call\_model(state: State):  
       \#... LLMを呼び出すロジック...  
       return {"messages": \[response\]}

3. **グラフの構築とエッジの配線**: StateGraphを初期化し、ノードとエッジを追加します。  
   Python  
   from langgraph.graph import StateGraph, END

   workflow \= StateGraph(State)  
   workflow.add\_node("agent", call\_model)  
   workflow.add\_conditional\_edges("agent", should\_continue\_logic) \# should\_continue\_logicは次のノードを返す関数  
   workflow.set\_entry\_point("agent")

4. **コンパイルと実行**: グラフをcompile()でコンパイルし、invoke()で実行します。  
   Python  
   app \= workflow.compile()  
   app.invoke({"messages": \[...\]})

#### **7\. デフォルトでの耐久性と永続性**

##### **7.1 チェックポインターの役割**

LangGraphにおける永続性は、チェックポインター（checkpointer）によって実現される第一級の機能です 8。グラフの各ステップが実行されるたびに、その時点の状態が保存されます。これにより、プロセスが中断された場合でも、中断した箇所から正確に再開することが可能になります 8。

##### **7.2 チェックポインターの実装**

開発用には、メモリ内に状態を保存するInMemorySaverが用意されています。しかし、本番環境では、PostgresやCouchbaseのような永続的なデータベースをバックエンドとするチェックポインターを使用することが不可欠です 32。

##### **7.3 スレッド：並行する会話の管理**

「スレッド」は、永続化された会話やワークフローを一意に識別するための概念です。チェックポインターを使用してグラフを呼び出す際には、config内にthread\_idを指定する必要があります。これにより、システムは正しい状態履歴を保存・ロードできます 32。

##### **7.4 実装：保存、再開、そしてタイムトラベル**

* **状態の永続化**: thread\_idを指定してグラフを呼び出すことで、状態が自動的に保存されます。  
  Python  
  config \= {"configurable": {"thread\_id": "user-123"}}  
  app.invoke({"messages": \[...\]}, config=config)

* **状態の確認**: graph.get\_state(config)を使用して、特定のスレッドの最新の状態を確認できます 32。  
* **履歴の取得（タイムトラベル）**: graph.get\_state\_history(config)を使用して、スレッドのすべての履歴的チェックポイントを取得できます。これにより、デバッグや「タイムトラベル」が可能になります 32。

#### **8\. LangGraphの高度な機能**

##### **8.1 ヒューマンインザループ（HITL）の実装**

LangGraphは、重要な意思決定を伴うワークフローに不可欠なHITLパターンをネイティブでサポートしています 8。

* **動的割り込み**: HITLに推奨されるアプローチは、ノード内で実行時の条件に基づいてinterrupt()関数を呼び出し、実行を一時停止することです 38。  
* **実行の再開**: 割り込まれたグラフは、同じthread\_idで再度invoke()を呼び出し、人間の入力を提供することで再開できます 39。  
* **チェックポインターの要件**: すべての割り込みベースのパターンは、一時停止中の状態を保存するために、設定済みのチェックポインターに依存します 39。

##### **8.2 サブグラフによるモジュラー設計**

複雑で保守性の高いシステムを構築するために、ワークフローの一部を再利用可能なサブグラフとしてカプセル化することができます 42。

* **ノードからのグラフ呼び出し**: 親グラフとサブグラフの状態スキーマが異なる場合、アダプターとして機能するノードを介してサブグラフを呼び出します 42。  
* **ノードとしてのグラフ追加**: 親グラフとサブグラフが状態スキーマの一部を共有している場合、サブグラフを直接ノードとして追加し、より密接に統合することができます 42。

---

### **第IV部：統合、応用、および移行**

#### **9\. 1.0フレームワークによるマルチエージェントシステムの構築**

##### **9.1 マルチエージェント設計のスペクトラム**

バージョン1.0のフレームワークは、マルチエージェントシステムを構築するための包括的なツールセットを提供します。その中心的な利点は、複雑な問題を専門的な協調型エージェントに分解できる点にあります 47。

##### **9.2 LangChainによるシンプルなオーケストレーション**

第II部で触れたように、create\_agentで作成したエージェントインスタンスを別のエージェントのツールとして扱うことで、シンプルな階層的タスクに適したマルチエージェントインタラクションを簡単に実現できます 12。

##### **9.3 LangGraphによる高度なアーキテクチャ**

より洗練されたマルチエージェントパターンはLangGraphで実装します。

* **Supervisorアーキテクチャ**: 最も一般的なパターンの一つで、中央の「スーパーバイザー」ノードがルーターとして機能し、タスクを専門のワーカーエージェントに委任し、その出力を統合します。各エージェントは独自の状態とツールを持つことができ、共有のグローバル状態を介して通信します 47。  
* **その他のパターン**: 通信がより分散化された協調型スウォームのようなアーキテクチャも構築可能です 47。

#### **10\. 実践的ガイダンスと移行戦略**

##### **10.1 意思決定フレームワーク：LangChainとLangGraphの使い分け**

開発者がプロジェクトに適したツールを選択するための明確なガイダンスを以下の表にまとめます。

| 特徴 | LangChain 1.0 (create\_agent) | LangGraph 1.0 |
| :---- | :---- | :---- |
| **抽象化レベル** | 高レベル（アプリケーションフレームワーク） | 低レベル（オーケストレーションランタイム） |
| **主なユースケース** | 標準的なエージェント（モデル→ツール→応答）の迅速な構築 | 複雑、カスタム、長時間実行、ステートフルなワークフローの構築 |
| **制御フロー** | 事前定義されたReActループ | ノードと条件付きエッジで明示的に定義されたグラフ。完全な制御が可能 |
| **カスタマイズ** | 構成可能なミドルウェア経由 | カスタムノード、エッジ、状態スキーマの定義による |
| **使いやすさ** | 高い。最小限の定型コード | 中程度。グラフの概念の理解が必要 |
| **選択すべきケース** | 信頼性の高い耐久性を備えた標準的なエージェントを迅速に製品化したい場合 | すべてのステップ、サイクル、ヒューマンインザループ、またはエージェント的/決定論的プロセスが混在するワークフローをきめ細かく制御したい場合 |

このフレームワークは、プロジェクトの要件（例：「複数の人間の承認ステップを持つ高度にカスタム化されたワークフローが必要」）に基づいて、LangGraphが適切な選択であることを即座に特定するのに役立ちます 1。

##### **10.2 v0.xからv1.0へのステップバイステップ移行ガイド**

既存のアプリケーションを移行するための実践的なチェックリストとして、以下のマッピング表を提供します。

| 非推奨のv0.xの概念 | v1.0での同等の機能/パターン | 必要なアクション |
| :---- | :---- | :---- |
| AgentExecutor, initialize\_agent | langchain.agents.create\_agent(...) | 新しい統一された関数を使用するようにエージェント作成をリファクタリングする |
| langgraph.prebuilt.create\_react\_agent | langchain.agents.create\_agent(...) | インポートパスと関数名を更新する。機能は強化されている |
| LLMChain, ConversationChain 等 | langchain-classic パッケージ または LCEL / create\_agent で再実装 | 応急処置として langchain-classic をインストールする。近代化のためにはロジックをリファクタリングする |
| カスタマイズのための BaseCallbackHandler | カスタムミドルウェア（デコレータまたはクラスベース） | コールバックロジックをミドルウェアフック（before\_model, after\_model 等）として書き直す |
| create\_react\_agent に渡す関数による動的プロンプト | @dynamic\_prompt ミドルウェア | 動的プロンプトロジックをデコレータ付きのミドルウェア関数にリファクタリングする |
| エージェント状態のためのPydantic/dataclass | AgentState を継承した TypedDict | 状態スキーマの定義をクラスから TypedDict に変更する |

このガイドは、移行の摩擦を大幅に低減し、新バージョンの採用を促進することを目的としています 15。

##### **10.3 結論：エージェント開発の未来**

LangChainとLangGraphのバージョン1.0リリースは、LangChainエコシステムにとって極めて重要な瞬間です。これにより、次世代の本番環境グレードのAIアプリケーションを構築するための、安定し、強力で、スケーラブルな基盤が確立されました 9。明確に分離された役割、ミドルウェアによる柔軟なカスタマイズ、そしてLangGraphによる耐久性のある実行は、開発者がより高度で信頼性の高いエージェントシステムを構築するための道筋を示しています。これは、エージェントAIが実験的なデモから、現実世界の課題を解決する堅牢なシステムへと移行する上での大きな一歩と言えるでしょう。

#### **引用文献**

1. LangChain and LangGraph Agent Frameworks Reach v1.0 Milestones, 11月 1, 2025にアクセス、 [https://blog.langchain.com/langchain-langgraph-1dot0/](https://blog.langchain.com/langchain-langgraph-1dot0/)  
2. LangChain v0.1.0, 11月 1, 2025にアクセス、 [https://blog.langchain.com/langchain-v0-1-0/](https://blog.langchain.com/langchain-v0-1-0/)  
3. LangChain & LangGraph 1.0 alpha releases \- Reddit, 11月 1, 2025にアクセス、 [https://www.reddit.com/r/LangChain/comments/1n6sjd1/langchain\_langgraph\_10\_alpha\_releases/](https://www.reddit.com/r/LangChain/comments/1n6sjd1/langchain_langgraph_10_alpha_releases/)  
4. LangChain 1.0 now generally available, 11月 1, 2025にアクセス、 [https://changelog.langchain.com/announcements/langchain-1-0-now-generally-available](https://changelog.langchain.com/announcements/langchain-1-0-now-generally-available)  
5. LangChain overview \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langchain/overview](https://docs.langchain.com/oss/python/langchain/overview)  
6. LangChain & LangGraph 1.0 alpha releases \- LangChain Blog, 11月 1, 2025にアクセス、 [https://blog.langchain.com/langchain-langchain-1-0-alpha-releases/](https://blog.langchain.com/langchain-langchain-1-0-alpha-releases/)  
7. LangChain v1 is now generally available\! \- Microsoft Community Hub, 11月 1, 2025にアクセス、 [https://techcommunity.microsoft.com/blog/azuredevcommunityblog/langchain-v1-is-now-generally-available/4462159](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/langchain-v1-is-now-generally-available/4462159)  
8. LangGraph 1.0 is now generally available \- LangChain \- Changelog, 11月 1, 2025にアクセス、 [https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available](https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available)  
9. LangGraph and LangChain Hit 1.0 Alpha: The Future of Agentic AI Infrastructure \- Medium, 11月 1, 2025にアクセス、 [https://medium.com/@fahey\_james/langgraph-and-langchain-hit-1-0-alpha-the-future-of-agentic-ai-infrastructure-8ea86c7c11c8](https://medium.com/@fahey_james/langgraph-and-langchain-hit-1-0-alpha-the-future-of-agentic-ai-infrastructure-8ea86c7c11c8)  
10. What's new in v1 \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/releases/langgraph-v1](https://docs.langchain.com/oss/python/releases/langgraph-v1)  
11. LangGraph \- GitHub Pages, 11月 1, 2025にアクセス、 [https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/)  
12. LangChain 1.0 — A second look. Rewriting how developers think about… | by Tituslhy | MITB For All, 11月 1, 2025にアクセス、 [https://medium.com/mitb-for-all/langchain-a-second-look-6ed720e27fec](https://medium.com/mitb-for-all/langchain-a-second-look-6ed720e27fec)  
13. Releases · langchain-ai/langchainjs \- GitHub, 11月 1, 2025にアクセス、 [https://github.com/langchain-ai/langchainjs/releases](https://github.com/langchain-ai/langchainjs/releases)  
14. What's new in v1 \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/releases/langchain-v1](https://docs.langchain.com/oss/python/releases/langchain-v1)  
15. LangChain v1 migration guide, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/migrate/langchain-v1](https://docs.langchain.com/oss/python/migrate/langchain-v1)  
16. What's new in v1 \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/javascript/releases/langchain-v1](https://docs.langchain.com/oss/javascript/releases/langchain-v1)  
17. Agents \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langchain/agents](https://docs.langchain.com/oss/python/langchain/agents)  
18. Agents \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/javascript/langchain/agents](https://docs.langchain.com/oss/javascript/langchain/agents)  
19. LangChain just introduced Agent Middleware in the 1.0 alpha version \- Reddit, 11月 1, 2025にアクセス、 [https://www.reddit.com/r/LangChain/comments/1ndaanh/langchain\_just\_introduced\_agent\_middleware\_in\_the/](https://www.reddit.com/r/LangChain/comments/1ndaanh/langchain_just_introduced_agent_middleware_in_the/)  
20. Agent Middleware \- LangChain Blog, 11月 1, 2025にアクセス、 [https://blog.langchain.com/agent-middleware/](https://blog.langchain.com/agent-middleware/)  
21. LangChain Middleware v1-Alpha: A Comprehensive Guide to Agent Control and Customization | Colin McNamara, 11月 1, 2025にアクセス、 [https://colinmcnamara.com/blog/langchain-middleware-v1-alpha-guide](https://colinmcnamara.com/blog/langchain-middleware-v1-alpha-guide)  
22. Build Production-Ready LLM Agents with LangChain 1.0 Middleware | CodeCut, 11月 1, 2025にアクセス、 [https://codecut.ai/langchain-1-0-middleware-production-agents/](https://codecut.ai/langchain-1-0-middleware-production-agents/)  
23. Middleware \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langchain/middleware](https://docs.langchain.com/oss/python/langchain/middleware)  
24. Standard message content \- LangChain Blog, 11月 1, 2025にアクセス、 [https://blog.langchain.com/standard-message-content/](https://blog.langchain.com/standard-message-content/)  
25. Messages \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langchain/messages](https://docs.langchain.com/oss/python/langchain/messages)  
26. LangChain v1 migration guide, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/javascript/migrate/langchain-v1](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)  
27. LangGraph Tutorial: What Is LangGraph and How to Use It? \- DataCamp, 11月 1, 2025にアクセス、 [https://www.datacamp.com/tutorial/langgraph-tutorial](https://www.datacamp.com/tutorial/langgraph-tutorial)  
28. LangGraph Basics: Understanding State, Schema, Nodes, and Edges \- Medium, 11月 1, 2025にアクセス、 [https://medium.com/@vivekvjnk/langgraph-basics-understanding-state-schema-nodes-and-edges-77f2fd17cae5](https://medium.com/@vivekvjnk/langgraph-basics-understanding-state-schema-nodes-and-edges-77f2fd17cae5)  
29. Thinking in LangGraph \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph](https://docs.langchain.com/oss/python/langgraph/thinking-in-langgraph)  
30. Graph API overview \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langgraph/graph-api](https://docs.langchain.com/oss/python/langgraph/graph-api)  
31. Graphs \- GitHub Pages, 11月 1, 2025にアクセス、 [https://langchain-ai.github.io/langgraph/reference/graphs/](https://langchain-ai.github.io/langgraph/reference/graphs/)  
32. Persistence \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langgraph/persistence](https://docs.langchain.com/oss/python/langgraph/persistence)  
33. Mastering Persistence in LangGraph: Checkpoints, Threads, and Beyond | by Vinod Rane, 11月 1, 2025にアクセス、 [https://medium.com/@vinodkrane/mastering-persistence-in-langgraph-checkpoints-threads-and-beyond-21e412aaed60](https://medium.com/@vinodkrane/mastering-persistence-in-langgraph-checkpoints-threads-and-beyond-21e412aaed60)  
34. Tutorial \- Persist LangGraph State with Couchbase Checkpointer, 11月 1, 2025にアクセス、 [https://developer.couchbase.com/tutorial-langgraph-persistence-checkpoint/](https://developer.couchbase.com/tutorial-langgraph-persistence-checkpoint/)  
35. Built with LangGraph\! \#17: Checkpoints | by Okan Yenigün | Towards Dev \- Medium, 11月 1, 2025にアクセス、 [https://medium.com/@okanyenigun/built-with-langgraph-17-checkpoints-2d1d54e1464b](https://medium.com/@okanyenigun/built-with-langgraph-17-checkpoints-2d1d54e1464b)  
36. Persistence, 11月 1, 2025にアクセス、 [https://langchain-ai.github.io/langgraphjs/how-tos/persistence/](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)  
37. How to use Postgres checkpointer for persistence, 11月 1, 2025にアクセス、 [https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/](https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/)  
38. LangGraph's human-in-the-loop \- Overview, 11月 1, 2025にアクセス、 [https://langchain-ai.github.io/langgraph/concepts/human\_in\_the\_loop/](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)  
39. Interrupts \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langgraph/interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)  
40. Step 6: Human in the Loop \- CopilotKit, 11月 1, 2025にアクセス、 [https://docs.copilotkit.ai/langgraph/tutorials/ai-travel-app/step-6-human-in-the-loop](https://docs.copilotkit.ai/langgraph/tutorials/ai-travel-app/step-6-human-in-the-loop)  
41. langgraph/concepts/human\_in\_the\_loop/ \#2290 \- GitHub, 11月 1, 2025にアクセス、 [https://github.com/langchain-ai/langgraph/discussions/2290](https://github.com/langchain-ai/langgraph/discussions/2290)  
42. Subgraphs \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/langgraph/use-subgraphs](https://docs.langchain.com/oss/python/langgraph/use-subgraphs)  
43. Subgraphs \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs](https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs)  
44. Conversational Patterns in LangGraph using Subgraphs | by Vinodh S Iyer | Medium, 11月 1, 2025にアクセス、 [https://medium.com/@vin4tech/conversational-patterns-in-langgraph-using-subgraphs-366d4dd27ebc](https://medium.com/@vin4tech/conversational-patterns-in-langgraph-using-subgraphs-366d4dd27ebc)  
45. LangGraph Subgraphs: A Guide to Modular AI Agents Development \- DEV Community, 11月 1, 2025にアクセス、 [https://dev.to/sreeni5018/langgraph-subgraphs-a-guide-to-modular-ai-agents-development-31ob](https://dev.to/sreeni5018/langgraph-subgraphs-a-guide-to-modular-ai-agents-development-31ob)  
46. How to transform the input and output of a subgraph | LangChain OpenTutorial \- GitBook, 11月 1, 2025にアクセス、 [https://langchain-opentutorial.gitbook.io/langchain-opentutorial/17-langgraph/01-core-features/14-langgraph-subgraph-transform-state](https://langchain-opentutorial.gitbook.io/langchain-opentutorial/17-langgraph/01-core-features/14-langgraph-subgraph-transform-state)  
47. LangGraph: Multi-Agent Workflows \- LangChain Blog, 11月 1, 2025にアクセス、 [https://blog.langchain.com/langgraph-multi-agent-workflows/](https://blog.langchain.com/langgraph-multi-agent-workflows/)  
48. LangGraph Multi-Agent Systems: Complete Tutorial & Examples \- Latenode, 11月 1, 2025にアクセス、 [https://latenode.com/blog/langgraph-multi-agent-systems-complete-tutorial-examples](https://latenode.com/blog/langgraph-multi-agent-systems-complete-tutorial-examples)  
49. LangGraph Multi Agent Workflow Tutorial \- Kinde, 11月 1, 2025にアクセス、 [https://kinde.com/learn/ai-for-software-engineering/ai-agents/langgraph-multiagent-workflow-tutorial/](https://kinde.com/learn/ai-for-software-engineering/ai-agents/langgraph-multiagent-workflow-tutorial/)  
50. Build a LangGraph Multi-Agent system in 20 Minutes with LaunchDarkly AI Configs, 11月 1, 2025にアクセス、 [https://launchdarkly.com/docs/tutorials/agents-langgraph](https://launchdarkly.com/docs/tutorials/agents-langgraph)  
51. LangGraph v1 migration guide \- Docs by LangChain, 11月 1, 2025にアクセス、 [https://docs.langchain.com/oss/python/migrate/langgraph-v1](https://docs.langchain.com/oss/python/migrate/langgraph-v1)  
52. How to migrate from v0.0 chains \- LangChain docs, 11月 1, 2025にアクセス、 [https://python.langchain.com/docs/versions/migrating\_chains/](https://python.langchain.com/docs/versions/migrating_chains/)