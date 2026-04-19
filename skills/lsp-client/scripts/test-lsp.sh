#!/usr/bin/env bash
# test-lsp.sh — 测试 LSP 服务器连接
# 用法:
#   ./test-lsp.sh --check-all          检查所有已安装的服务器
#   ./test-lsp.sh --check typescript   检查特定服务器
#   ./test-lsp.sh --server <cmd>       测试任意 LSP 服务器

set -e

check_server() {
  local cmd="$1"
  local lang="$2"

  echo -n "  $lang ($cmd)... "
  if command -v "$cmd" &>/dev/null; then
    local version
    version=$("$cmd" --version 2>/dev/null | head -1 || echo "unknown")
    echo "✅ $version"
    return 0
  else
    echo "❌ 未找到 (run: npm i -g $cmd)"
    return 1
  fi
}

check_all() {
  echo "🔍 检查所有支持的 LSP 服务器..."
  echo ""

  local failed=0

  check_server "typescript-language-server" "TypeScript" || ((failed++))
  check_server "pyright-langserver" "Python (pyright)" || ((failed++))
  check_server "jedi-language-server" "Python (jedi)" || ((failed++))
  check_server "rust-analyzer" "Rust" || ((failed++))
  check_server "gopls" "Go" || ((failed++))
  check_server "clangd" "C/C++" || ((failed++))
  check_server "volar" "Vue" || ((failed++))

  echo ""
  if [ $failed -eq 0 ]; then
    echo "✅ 所有 LSP 服务器已安装！"
  else
    echo "⚠️  $failed 个服务器未安装，请先安装对应 LSP 服务器"
  fi
}

check_single() {
  local server="$1"
  case "$server" in
    typescript|ts)
      check_server "typescript-language-server" "TypeScript"
      ;;
    python|py)
      check_server "pyright-langserver" "Python (pyright)" || \
      check_server "jedi-language-server" "Python (jedi)"
      ;;
    rust|rs)
      check_server "rust-analyzer" "Rust"
      ;;
    go)
      check_server "gopls" "Go"
      ;;
    c|cpp|clangd)
      check_server "clangd" "C/C++"
      ;;
    vue|volar)
      check_server "volar" "Vue"
      ;;
    *)
      echo "❌ 未知服务器类型: $server"
      echo "支持的类型: typescript, python, rust, go, c, vue"
      exit 1
      ;;
  esac
}

test_server_stdio() {
  local cmd="$1"
  shift
  local args=("$@")

  echo "🔌 测试 $cmd ${args[*]} (stdio)..."

  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ $cmd 未找到"
    return 1
  fi

  # 发送 LSP initialize 请求，验证服务器能响应
  local init_req='{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"processId":null,"rootUri":null,"capabilities":{}}}'

  local response
  response=$(echo "$init_req" | timeout 5 "$cmd" "${args[@]}" 2>/dev/null | head -1 || echo "")

  if [ -n "$response" ]; then
    echo "✅ 服务器响应正常"
    echo "   $response" | head -c 200
    echo ""
    return 0
  else
    echo "❌ 服务器无响应或超时"
    echo "   手动测试: $cmd ${args[*]} --stdio"
    return 1
  fi
}

show_help() {
  cat <<EOF
test-lsp.sh — LSP 服务器连接测试工具

用法:
  ./test-lsp.sh --check-all              检查所有已安装的服务器
  ./test-lsp.sh --check <type>           检查特定类型 (typescript/python/rust/go/c/vue)
  ./test-lsp.sh --server <cmd> [args]    测试任意 LSP 服务器

示例:
  ./test-lsp.sh --check-all
  ./test-lsp.sh --check typescript
  ./test-lsp.sh --server typescript-language-server --stdio
  ./test-lsp.sh --server pyright-langserver --stdio
EOF
}

case "${1:-}" in
  --check-all)
    check_all
    ;;
  --check)
    check_single "$2"
    ;;
  --server)
    shift
    test_server_stdio "$@"
    ;;
  --help|-h|help)
    show_help
    ;;
  *)
    if [ -n "$1" ]; then
      echo "❌ 未知参数: $1"
      show_help
      exit 1
    else
      show_help
    fi
    ;;
esac
