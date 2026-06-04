#!/bin/bash

# --- CONFIGURAÇÃO DE CORES ---
VERDE='\033[0;32m'
CIANO='\033[0;36m'
AMARELO='\033[1;33m'
VERMELHO='\033[0;31m'
NC='\033[0m'

# --- VERSÃO ATUAL ---
# VERSION: odka9 8 7 7 6 5 3 2

# Pega a versão atual do próprio arquivo
ULTIMA_V=$(grep "^# VERSION:" "$0" | cut -d ' ' -f 3)

echo -e "\n${AMARELO}--------------------------------------${NC}"
echo -e "Última versão registrada: ${VERDE}$ULTIMA_V${NC}"
read -p "Digite o número da nova versão: " NOVA_V
echo -e "${AMARELO}--------------------------------------${NC}\n"

echo -e "${CIANO}Adicionando arquivos e commitando v$NOVA_V...${NC}"
git add .
git commit -m "v$NOVA_V"

echo -e "${CIANO}Subindo para o GitHub...${NC}"
# Tentativa de push - removemos o -q para você ver o que acontece
if git push origin main; then
    # O comando sed só roda SE o git push retornar 0 (sucesso)
    sed -i "s/^# VERSION: $ULTIMA_V/# VERSION: $NOVA_V/" "$0"
    echo -e "\n${VERDE}✔ Sucesso! Versão $NOVA_V lançada e script atualizado.${NC}"
else
    echo -e "\n${VERMEDLHO}✖ Erro ao subir para o GitHub. A versão no script NÃO foi alterada.${NC}"
    echo -e "${AMARELO}Dica: Tente resolver o conflito manualmente antes de rodar o script novamente.${NC}"
    exit 1
fi