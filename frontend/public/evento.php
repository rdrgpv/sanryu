<?php
// Link de evento (/eventos/<slug>) com prévia própria no WhatsApp, Instagram e Facebook.
//
// Esses robôs não rodam o React: leem só o HTML que o servidor entrega, então todo link do site
// mostrava o logo genérico. O .htaccess manda /eventos/<slug> pra cá; este script pega o index.html
// do build, troca título, descrição e imagem pelos do evento e entrega o resto igual — pra pessoa,
// a página é a mesma SPA de sempre. Se a API falhar, entrega o index.html sem mexer.

const API = 'https://api.sanryu.com.br/api';
const SITE = 'https://sanryu.com.br';

$html = file_get_contents(__DIR__ . '/index.html');
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';

function buscarEvento($slug) {
    if (!preg_match('/^[A-Za-z0-9-]{1,120}$/', $slug)) return null;

    $url = API . '/eventos/' . rawurlencode($slug) . '/publico';
    $corpo = false;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4, CURLOPT_CONNECTTIMEOUT => 3]);
        $corpo = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($status !== 200) $corpo = false;
    } else {
        $corpo = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 4]]));
    }

    $evento = $corpo ? json_decode($corpo, true) : null;
    return is_array($evento) && isset($evento['nome']) ? $evento : null;
}

function resumo($texto, $limite = 200) {
    $texto = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $texto)));
    if (mb_strlen($texto, 'UTF-8') <= $limite) return $texto;
    return rtrim(mb_substr($texto, 0, $limite - 1, 'UTF-8')) . '…';
}

$evento = buscarEvento($slug);

if ($evento) {
    $e = function ($texto) { return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8'); };

    $partes = [];
    if (!empty($evento['data'])) {
        $data = new DateTime($evento['data']);
        $data->setTimezone(new DateTimeZone('America/Sao_Paulo'));
        $partes[] = $data->format('d/m/Y');
    }
    if (!empty($evento['local'])) $partes[] = $evento['local'];
    $descricao = resumo(implode(' · ', $partes) . (empty($evento['descricao']) ? '' : ' — ' . $evento['descricao']));
    if ($descricao === '') $descricao = 'Inscrições abertas no San·Ryu Dojo — Morganti Ju-Jitsu.';

    $titulo = $evento['nome'] . ' | San·Ryu Dojo';
    $url = SITE . '/eventos/' . rawurlencode($evento['slug'] ? $evento['slug'] : $evento['id']);
    $imagem = empty($evento['banner'])
        ? SITE . '/logos/sanryu-dragao.png'
        : API . '/eventos/' . rawurlencode($evento['id']) . '/imagem-compartilhamento';

    // Tira as tags genéricas do index.html e põe as do evento.
    $html = preg_replace('/<title>.*?<\/title>/s', '', $html);
    $html = preg_replace('/<meta\s+(?:property="og:[^"]*"|name="(?:description|twitter:card)")\s+content="[^"]*"\s*\/?>/s', '', $html);

    $tags = '<title>' . $e($titulo) . '</title>' . "\n"
        . '    <meta name="description" content="' . $e($descricao) . '" />' . "\n"
        . '    <meta property="og:type" content="website" />' . "\n"
        . '    <meta property="og:locale" content="pt_BR" />' . "\n"
        . '    <meta property="og:site_name" content="San·Ryu Dojo" />' . "\n"
        . '    <meta property="og:title" content="' . $e($evento['nome']) . '" />' . "\n"
        . '    <meta property="og:description" content="' . $e($descricao) . '" />' . "\n"
        . '    <meta property="og:url" content="' . $e($url) . '" />' . "\n"
        . '    <meta property="og:image" content="' . $e($imagem) . '" />' . "\n"
        . '    <meta name="twitter:card" content="' . (empty($evento['banner']) ? 'summary' : 'summary_large_image') . '" />' . "\n"
        . '  </head>';
    $html = preg_replace('/<\/head>/', $tags, $html, 1);
}

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache');
echo $html;
