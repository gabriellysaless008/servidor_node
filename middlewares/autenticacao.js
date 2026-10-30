
// Identifica o usuário que está logado
function carregarUsuario(req, res, next) {
    req.usuario = req.session.usuario || null;
    next();
}


// Verifica quem pode alterar o inventário
function autorizarEdicaoInventario(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            erro: "Faça login para alterar o inventário."
        });
    }

    const perfisAutorizados = ["atendente", "gerente", "administrador"];

    const tipoPerfil = req.usuario.tipo_perfil;

    if (!perfisAutorizados.includes(tipoPerfil)) {
        return res.status(403).json({
            erro: "Você não tem permissão para alterar o inventário."
        });
    }

    next();
}


// Verifica quem pode acessar os relatórios
function verificarAcessoRelatorios(req, res, next) {

    if (!req.usuario) {
        return res.status(401).json({
            erro: "Você precisa fazer login para acessar os relatórios."
        });
    }

    const perfisAutorizados = ["gerente", "administrador"];

    if (!perfisAutorizados.includes(req.usuario.tipo_perfil)) {
        return res.status(403).json({
            erro: "Acesso permitido somente para Gerentes e Administradores."
        });
    }

    next();
}


// Exporta as funções
module.exports = {
    carregarUsuario,
    autorizarEdicaoInventario,
    verificarAcessoRelatorios
};
