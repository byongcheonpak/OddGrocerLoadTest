#!/bin/bash

# OddGrocer HTTP 부하 테스트 실행 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 로드
if [ -f .env ]; then
    source .env
    log_info "환경 변수 로드 완료"
else
    log_warning ".env 파일을 찾을 수 없습니다. 기본값을 사용합니다."
fi

# 기본 설정
BASE_URL=${BASE_URL:-"https://m.oddgrocer.com"}
REPORT_DIR="reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 리포트 디렉토리 생성
mkdir -p $REPORT_DIR

log_info "OddGrocer HTTP 부하 테스트 시작"
log_info "대상 URL: $BASE_URL"
log_info "타임스탬프: $TIMESTAMP"

# 테스트 타입 선택
show_menu() {
    echo ""
    echo "=== OddGrocer HTTP 부하 테스트 메뉴 ==="
    echo "1) 빠른 테스트 (메인페이지 기본 부하)"
    echo "2) 메인 → 매장 이동 시나리오" 
    echo "3) API 엔드포인트 테스트"
    echo "4) 전체 시나리오 테스트"
    echo "5) 커스텀 부하 프로필 테스트"
    echo "6) 연속 테스트 (모든 시나리오)"
    echo "0) 종료"
    echo "=================================="
}

# 부하 프로필 선택
select_load_profile() {
    echo ""
    echo "=== 부하 프로필 선택 ==="
    echo "1) 가벼운 부하 (light_load)"
    echo "2) 중간 부하 (medium_load)"
    echo "3) 높은 부하 (heavy_load)"
    echo "4) 스파이크 테스트 (spike_load)"
    echo "5) 스트레스 테스트 (stress_load)"
    echo "========================="
    read -p "프로필을 선택하세요 (1-5): " profile_choice
    
    case $profile_choice in
        1) echo "light_load" ;;
        2) echo "medium_load" ;;
        3) echo "heavy_load" ;;
        4) echo "spike_load" ;;
        5) echo "stress_load" ;;
        *) echo "light_load" ;;
    esac
}

# 테스트 실행 함수
run_test() {
    local scenario=$1
    local output_file=$2
    local config_file=$3
    
    log_info "테스트 실행 중: $scenario"
    
    if [ -n "$config_file" ]; then
        artillery run $scenario --config config/$config_file.yml --output $output_file
    else
        artillery run $scenario --output $output_file
    fi
    
    if [ $? -eq 0 ]; then
        log_success "테스트 완료: $scenario"
        # HTML 리포트 생성
        local html_file="${output_file%.json}.html"
        artillery report $output_file --output $html_file
        log_success "리포트 생성: $html_file"
    else
        log_error "테스트 실패: $scenario"
        return 1
    fi
}

# 메인 로직
main() {
    while true; do
        show_menu
        read -p "선택하세요 (0-6): " choice
        
        case $choice in
            1)
                log_info "빠른 테스트 시작..."
                run_test "scenarios/http/main-page-load.yml" "$REPORT_DIR/quick-test_$TIMESTAMP.json"
                ;;
            2)
                log_info "메인 → 매장 이동 시나리오 테스트 시작..."
                run_test "scenarios/http/store-navigation.yml" "$REPORT_DIR/store-navigation_$TIMESTAMP.json"
                ;;
            3)
                log_info "API 엔드포인트 테스트 시작..."
                run_test "scenarios/http/api-endpoints.yml" "$REPORT_DIR/api-endpoints_$TIMESTAMP.json"
                ;;
            4)
                log_info "전체 시나리오 테스트 시작..."
                run_test "scenarios/http/main-page-load.yml" "$REPORT_DIR/main-page_$TIMESTAMP.json"
                run_test "scenarios/http/store-navigation.yml" "$REPORT_DIR/store-navigation_$TIMESTAMP.json"
                run_test "scenarios/http/api-endpoints.yml" "$REPORT_DIR/api-endpoints_$TIMESTAMP.json"
                ;;
            5)
                log_info "커스텀 부하 프로필 테스트..."
                profile=$(select_load_profile)
                log_info "선택된 프로필: $profile"
                run_test "scenarios/http/main-page-load.yml" "$REPORT_DIR/custom-${profile}_$TIMESTAMP.json" "$profile"
                ;;
            6)
                log_info "연속 테스트 시작..."
                profiles=("light_load" "medium_load" "heavy_load")
                scenarios=("scenarios/http/main-page-load.yml" "scenarios/http/store-navigation.yml")
                
                for profile in "${profiles[@]}"; do
                    for scenario in "${scenarios[@]}"; do
                        scenario_name=$(basename $scenario .yml)
                        output_file="$REPORT_DIR/continuous-${profile}-${scenario_name}_$TIMESTAMP.json"
                        run_test "$scenario" "$output_file" "$profile"
                        sleep 30  # 테스트 간 대기
                    done
                done
                ;;
            0)
                log_info "테스트 도구를 종료합니다."
                break
                ;;
            *)
                log_error "잘못된 선택입니다. 다시 선택해주세요."
                ;;
        esac
        
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
    done
}

# 의존성 확인
check_dependencies() {
    if ! command -v artillery &> /dev/null; then
        log_error "Artillery가 설치되어 있지 않습니다."
        log_info "npm install -g artillery 명령으로 설치해주세요."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되어 있지 않습니다."
        exit 1
    fi
    
    log_success "모든 의존성이 확인되었습니다."
}

# 스크립트 시작
echo "🚀 OddGrocer Artillery HTTP 부하 테스트 도구"
echo "=============================================="

check_dependencies
main

log_success "테스트 완료! 리포트는 $REPORT_DIR 폴더에서 확인하세요."