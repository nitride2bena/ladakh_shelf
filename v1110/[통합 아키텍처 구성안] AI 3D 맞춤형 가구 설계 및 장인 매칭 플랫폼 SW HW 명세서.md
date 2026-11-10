# [통합 아키텍처 구성안] AI 3D 맞춤형 가구 설계 및 장인 매칭 플랫폼 S/W & H/W 명세서

> **[문서 활용 및 다운로드/공유 안내]**: 본 마크다운(`.md`) 문서는 우측 상단의 복사 버튼을 통해 클립보드 공유 또는 단일 `.md` 파일로 즉시 저장·다운로드하여 시스템 구축 설계서로 활용할 수 있습니다. 구체적인 Docker 설정 코드, CI/CD 스크립트 및 인프라 스키마는 본문 가독성을 위해 아키텍처 설명 텍스트로 통합 대체되었으며, 하단 선택지를 통해 별도의 다운로드 가능한 설정 파일들로 분리 생성할 수 있습니다.

---

## 1. 아키텍처 설계 핵심 목표 (Architecture Goals)

| 번호 | 핵심 설계 목표 | 달성 효과 및 핵심 가치 | 구체적 구현 전략 |
| :---: | :--- | :--- | :--- |
| **01** | **초경량 서버 인프라<br>(Ultra-Light Backend)** | 서버 인프라 유지비용 90% 이상 절감 | 고비용 GPU 추론은 사용자 단말 BYOK(모델 공급사 직접 호출)로 분산하고, 3D 연산은 클라이언트 WebGL에 위임하여 경량 CPU 인스턴스만으로 수천 명 동시 접속 수용 |
| **02** | **크로스플랫폼 단일 코드베이스<br>(Single Codebase)** | 플랫폼 간 중복 개발 및 유지보수 비용 반감 | 모바일(Android/iOS WebView)과 데스크톱(Windows/macOS Web/Tauri)이 단일 TypeScript + Three.js + JSCAD 코어를 공유하여 100% 동일한 사용자 경험 제공 |
| **03** | **현장 친화적 공방 자동화<br>(Shop-Floor Automation)** | 도면 오류로 인한 목재 폐기율 0% 달성 | 목공방 PC 워크스테이션에서 Google Antigravity와 FreeCAD MCP 데몬이 로컬 하드웨어를 활용해 무거운 B-Rep 솔리드 연산과 CNC 가공용 2D DXF를 즉시 추출 |

---

## 2. 소프트웨어 아키텍처 구성안 (Software Architecture)

소프트웨어 스택은 역할에 따라 **4개의 논리적 계층(4-Tier Logical Layers)**과 모노레포 기반 패키지로 구성된다.

### 2.1. 4-Tier 논리 계층 아키텍처 명세표

| 논리 계층 (Logical Tier) | 주요 채택 기술 스택 | 담당 핵심 컴포넌트 및 세부 역할 | 계층 간 통신 프로토콜 |
| :--- | :--- | :--- | :--- |
| **Tier 1<br>클라이언트 프레젠테이션 계층<br>(Client Tier)** | • TypeScript 5.x<br>• Three.js (r160+)<br>• JSCAD (`@jscad/modeling`)<br>• Zustand (반응형 상태)<br>• Kotlin / Android WebView | • **공통 3D 코어**: CSG 불리언 부품 생성 및 계층형 피벗 씬 그래프 기반 60 FPS 기구학 구동<br>• **모바일 앱 쉘**: Android Keystore 기반 BYOK 키 하드웨어 암호화 보관 및 네이티브 파일 입출력<br>• **장인 포털 쉘**: React 기반 다크 테마 3분할 워크스페이스<br>• **에이전트 브라우저**: Aside / Ego 브라우저 연동 | ↕ **HTTPS REST API**<br>↕ **WebSocket Realtime**<br>↕ **JSON-RPC (stdio)** |
| **Tier 2<br>오케스트레이션 & 비즈니스 계층<br>(Application Tier)** | • Python 3.11<br>• FastAPI (Uvicorn ASGI)<br>• NumPy / SciPy<br>• Pydantic v2<br>• Nginx / Cloudflare Tunnel | • **API 게이트웨이**: SSL 종단, Rate Limiting, JWT 인증<br>• **구조 검증기**: 선반 처짐비(Sagging) 및 힌지 회전 간섭 계산<br>• **템플릿 매칭 엔진**: 공방 표준 모델 자동 치수 모핑(Auto-Fitting)<br>• **지침서 합성기**: RFI 응답 파싱 및 마크다운 지침서 동적 생성<br>• **원가 산출기**: 4x8 원판 Nesting 수율 및 실시간 견적 연동 | ↕ **PostgreSQL Wire**<br>↕ **Redis / Supabase Realtime** |
| **Tier 3<br>데이터 & 실시간 동기화 계층<br>(Data & Sync Tier)** | • Supabase (PostgreSQL 15+)<br>• Supabase Realtime (WebSocket)<br>• Supabase Storage / S3 호환 | • **메인 DB**: 상태 머신, 가변 어셈블리 트리(JSONB), 공방 카탈로그, 입찰 이력, SHA-256 해시 보관<br>• **실시간 동기화**: 모바일-PC 간 3D 카메라 뷰포트, 도어 회전 각도, RFI 입력값 양방향 미러링<br>• **오브젝트 스토리지**: 현장 실측 사진, 최종 STEP, 2D DXF 도면, 재단표(BOM PDF) 보관 | ↕ **MCP JSON-RPC**<br>↕ **Web Worker Wasm Bus** |
| **Tier 4<br>정밀 CAD 코어 & 공방 제조 계층<br>(CAD & Manufacturing Tier)** | • FreeCAD Web (Wasm)<br>• Google Antigravity IDE/CLI<br>• `freecad-mcp` 데몬<br>• FreeCAD 1.0 (C++/Python) | • **모바일/웹 온디맨드**: Web Worker 지연 로딩 기반 경량 간섭 검증 및 STEP 생성<br>• **공방 워크스테이션**: OpenCASCADE B-Rep 커널을 직접 구동하여 1:1 정밀 STEP 도면, CNC 가공용 2D DXF(TechDraw), 4x8 원판 재단 배치도 일괄 출력 | - |

---

### 2.2. 소프트웨어 모듈별 상세 기술 스택 요약표

| 구분 | 구성 모듈 | 채택 소프트웨어 / 프레임워크 | 선정 이유 및 주요 기능 |
| :--- | :--- | :--- | :--- |
| **프론트엔드 코어** | 3D & 기구학 엔진 | **Three.js + JSCAD** | 수 MB 미만의 초경량 번들로 모바일/PC 모두 60 FPS 보장, CSG 불리언 및 피벗 트리 지원 |
| **모바일 앱** | 안드로이드 래퍼 | **Kotlin + Android WebView** | `EncryptedSharedPreferences`로 사용자 BYOK API Key 하드웨어 암호화 및 네이티브 파일 입출력 |
| **데스크톱/웹** | 장인 검토 포털 | **React (Vite) + Tailwind CSS** | 다크 테마 기본 지원, 3분할 워크스페이스 및 모바일 바텀 시트(Bottom Sheet) 반응형 전환 |
| **백엔드 API** | 검증/지침/견적 서버 | **Python FastAPI + Pydantic** | 엄격한 JSON 스키마 검증, 빠른 수학 연산, FreeCAD Python 코드와의 높은 문법 호환성 |
| **데이터베이스** | 영속성 & 동기화 | **Supabase (PostgreSQL)** | JSONB 타입으로 가변적인 어셈블리 트리와 공방 템플릿 저장, Realtime 채널로 기기 간 즉시 동기화 |
| **AI 추론 연동** | 온디바이스 브리지 | **Google GenAI SDK (Client)** | 자사 서버를 거치지 않고 클라이언트에서 Gemini 1.5 Pro / Flash 등으로 직접 지침서(`.md`) 주입 호출 |
| **공방 CAD 자동화** | 로컬 에이전트 | **Google Antigravity + FreeCAD MCP** | 공방 PC에서 자연어/지침서 기반으로 FreeCAD 1.0을 직접 구동하여 무거운 가공 도면 일괄 생성 |

---

## 3. 하드웨어 및 네트워크 인프라 아키텍처 (Hardware Architecture)

### 3.1. 물리적 영역별 인프라 구성 토폴로지 명세표

| 영역 구분 | 물리적 장비 및 인스턴스 | 핵심 사양 요약 | 통신 채널 및 인터페이스 |
| :--- | :--- | :--- | :--- |
| **영역 1<br>소비자 & 현장 실측 단말** | • 스마트폰 (Android / iOS)<br>• 태블릿 / 소비자 노트북 PC | • Snapdragon 865 / Exynos, RAM 8~12GB, WebGL 2.0 지원 GPU<br>• 후면 고해상도 카메라 및 ToF/심도 센서 | ◄══ **HTTPS / WSS** ══►<br>(클라우드 코어 백엔드) |
| **영역 2<br>클라우드 코어 인프라** | • Application Docker Container Node<br>• Managed Database & Storage | • 초경량 Linux VPS (2 vCPU, 4GB RAM, NVMe SSD)<br>• Supabase Managed PostgreSQL + S3 Compatible Storage<br>• Cloudflare 글로벌 CDN (정적 WASM 및 3D 번들 캐싱) | ◄══ **WSS (Realtime)** ══►<br>(공방 워크스테이션) |
| **영역 3<br>목공방(Shop-Floor) 하드웨어** | • 공방 메인 설계 PC (Workstation)<br>• 현장 확인용 터치 태블릿 | • Intel Core i7 13세대 / AMD Ryzen 7, RAM 32GB, RTX 3060+<br>• Google Antigravity + FreeCAD 1.0 로컬 MCP 데몬<br>• 10~12인치 방진 케이스 태블릿 | ◄══ **로컬 LAN / USB** ══►<br>(공방 디지털 가공 장비) |
| **영역 3-1<br>공방 디지털 가공 장비** | • 3축 CNC 라우터 (4x8 베드)<br>• 패널 쏘 (자동 재단기)<br>• 바코드 라벨 프린터 | • FreeCAD TechDraw 생성 DXF / G-Code 기반 정밀 절삭<br>• 원판 최적 재단 치수선 연동<br>• 부재 관리용 바코드 라벨 실시간 출력 | - |

---

### 3.2. 영역별 하드웨어 상세 규격표 (Hardware Specifications)

#### ① 소비자 및 현장 실측 단말 (Client Devices)

| 하드웨어 항목 | 최소 요구 사양 (Minimum) | 권장 사양 (Recommended) | 비고 및 선정 기준 |
| :--- | :--- | :--- | :--- |
| **기준 단말 기종** | Samsung Galaxy S20 또는 동급 스마트폰 | Galaxy S23 Ultra 이상 또는 최신 태블릿 | Android 13 이상 OS 환경 권장 |
| **프로세서 (AP/CPU)** | Octa-Core (2.8GHz 이상) | Snapdragon 8 Gen 2 이상 | 60 FPS Three.js 기구학 연산 수행 |
| **시스템 메모리 (RAM)** | 6 GB RAM | 8 GB ~ 12 GB RAM | WebView 상시 할당 메모리 150MB 이내 엄수 |
| **그래픽 가속 (GPU)** | WebGL 2.0 지원 GPU (Adreno 650급) | 최신 모바일 GPU (120Hz 주사율 대응) | 정밀 부재 텍스처 및 부드러운 도어 개폐 |
| **센서 및 카메라** | 1,200만 화소 후면 카메라 | ToF 심도 센서 탑재 초광각 카메라 | 벽면 걸레받이 및 콘센트 위치 실측 사진 촬영 |

#### ② 중앙 클라우드 서버 인프라 (Cloud Backend)

| 서버 역할 구분 | 초기 MVP 인스턴스 사양 | 스케일아웃 확장 사양 | 월 예상 인프라 비용 |
| :--- | :--- | :--- | :---: |
| **FastAPI 오케스트레이션 노드** | 2 vCPU, 4GB RAM, 80GB NVMe SSD<br>(Ubuntu 24.04 LTS, Docker) | 4 vCPU, 8GB RAM × 2대<br>(로드밸런서 연동 무중단 배포) | 월 \$15 ~ \$25 수준<br>(초저비용 구성) |
| **헤드리스 CAD 워커 노드** | 애플리케이션 노드와 통합 운영 | 별도 분리: 4 vCPU, 8GB RAM 1대<br>(대량 STEP 변환 배치 처리) | 월 \$20 ~ \$40 수준 |
| **PostgreSQL & Storage** | Supabase Pro 티어 인스턴스<br>(일일 자동 백업 활성화) | 전용 고성능 PostgreSQL 인스턴스<br>(PITR 복원 및 다중 리전 복제) | 월 \$25 ~ \$50 수준 |

#### ③ 목공방 장인 워크스테이션 및 가공 장비 (Maker Workshop)

| 하드웨어 구성 요소 | 권장 하드웨어 사양 | 소프트웨어 환경 | 주요 업무 및 가공 역할 |
| :--- | :--- | :--- | :--- |
| **공방 메인 설계 PC** | • **CPU**: Intel i7 (13세대+) / Ryzen 7 (7000+)<br>• **RAM**: 32 GB DDR5<br>• **GPU**: NVIDIA RTX 3060 / 4060 (VRAM 8GB+)<br>• **저장장치**: 1TB NVMe M.2 SSD | • Windows 11 Pro 64-bit<br>• Google Antigravity IDE/CLI<br>• FreeCAD 1.0 정식 릴리즈<br>• RustDesk 원격 데몬 (`hbbs`/`hbbr`) | OpenCASCADE B-Rep 메싱 연산, 3D X-Ray 투시 가속, 로컬 MCP 서버 구동 및 1:1 STEP/DXF 도면 추출 |
| **현장 작업대 서브 단말** | • 10 ~ 12인치 방진 케이스 장착 태블릿<br>• 정전식 터치 펜 지원 | • Chrome / Edge PWA 웹 브라우저<br>• 장인 검토 포털 반응형 모드 | 목공 톱밥 보호 케이스 장착 후 작업대 위에서 3D 조립도 터치 확인 및 재단 체크리스트 확인 |
| **CNC 라우터 장비** | • 4x8(1220×2440mm) 평판 베드 3축 라우터<br>• 진공 흡착 베드 및 ATC 자동 공구 교환기 | • Mach3 / NcStudio / Syntec 컨트롤러<br>• FreeCAD TechDraw 추출 DXF 호환 | 부재 외곽선 정밀 재단, 도미노 촉 가공, 경첩 컵 타공, 걸레받이 따내기 홈 가공 |

---

## 4. 네트워크 보안 및 무결성 아키텍처 (Security & Network Flow)

| 보안 도메인 | 핵심 보안 원칙 | 구체적 기술 구현 및 방어 메커니즘 |
| :--- | :--- | :--- |
| **BYOK 계정 보안** | **Zero-Knowledge Architecture** | • `[클라이언트] ──(HTTPS/TLS 1.3)──► [Google Gemini API]` 경로와 자사 서버 경로를 물리적·논리적으로 완전 분리<br>• 사용자의 개인 LLM API Key는 네트워크 패킷을 통해 자사 서버로 일절 전송되지 않음 |
| **계약 데이터 무결성** | **Cryptographic Contract Lock** | • 최종 견적 승인 시점의 JSON 어셈블리 트리와 사양서(`.md`)를 서버 비밀키로 `HMAC-SHA256` 서명 동결<br>• 공방의 FreeCAD MCP가 가공 도면을 생성할 때 해시값을 대조하여 잘못된 구버전 도면 재단 사고 원천 방지 |
| **공방 로컬 환경 격리** | **Localhost MCP Sandbox** | • 공방 PC의 `freecad-mcp` 데몬은 외부 인터넷에 포트를 노출하지 않고 로컬 `stdio` 또는 `127.0.0.1` 소켓 통신만 허용<br>• 장인 검토 포털 접근 링크는 유효시간이 엄격히 제한된 일회용 JWT 토큰으로 인증 |
