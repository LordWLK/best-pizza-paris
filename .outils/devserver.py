#!/usr/bin/env python3
"""Serveur de test local pour bestpizzaparis.com (python .outils/devserver.py 3210 .).

Rejoue les directives du .htaccess utiles en local :
  - Header always set / Header set (CSP, sécurité, Cache-Control par extension)
  - ErrorDocument 404 -> /404.html
  - RedirectMatch 404 pour les fichiers cachés et .md/.bak...
  - /index.html -> / (301) ; extensions .html optionnelles non gérées (comme en prod)

Usage : python3 devserver.py <port> <dossier du site>
"""
import http.server
import os
import re
import sys
import posixpath
import urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3210
ROOT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else '.')

GLOBAL_HEADERS = []            # [(name, value)]
MATCH_HEADERS = []             # [(regex, name, value)]
BLOCKED = []                   # [regex]


def parse_htaccess(path):
    if not os.path.exists(path):
        print('ATTENTION : pas de .htaccess dans', ROOT, file=sys.stderr)
        return
    current_match = None
    for raw in open(path, encoding='utf-8'):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        m = re.match(r'<FilesMatch\s+"(.+)">', line)
        if m:
            current_match = re.compile(m.group(1))
            continue
        if line.startswith('</FilesMatch>'):
            current_match = None
            continue
        m = re.match(r'Header\s+(?:always\s+)?set\s+([\w-]+)\s+"(.*)"\s*$', line)
        if m:
            name, value = m.group(1), m.group(2)
            if current_match is None:
                GLOBAL_HEADERS.append((name, value))
            else:
                MATCH_HEADERS.append((current_match, name, value))
            continue
        m = re.match(r'RedirectMatch\s+404\s+"(.+)"', line)
        if m:
            BLOCKED.append(re.compile(m.group(1)))


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = 'devserver/1.0'

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))

    def _apply_headers(self, filename):
        for name, value in GLOBAL_HEADERS:
            self.send_header(name, value)
        for rx, name, value in MATCH_HEADERS:
            if rx.search(filename):
                self.send_header(name, value)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = urllib.parse.unquote(parsed.path)
        # /index.html -> /
        if re.search(r'/+index\.html$', path):
            self.send_response(301)
            self.send_header('Location', '/' + ('?' + parsed.query if parsed.query else ''))
            self.end_headers()
            return
        for rx in BLOCKED:
            if rx.search(path):
                return self._send_404()
        local = self.translate_path(path)
        if os.path.isdir(local):
            local = os.path.join(local, 'index.html')
        if not os.path.isfile(local):
            return self._send_404()
        try:
            with open(local, 'rb') as f:
                data = f.read()
        except OSError:
            return self._send_404()
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(local))
        self.send_header('Content-Length', str(len(data)))
        self._apply_headers(os.path.basename(local))
        self.end_headers()
        self.wfile.write(data)

    def do_HEAD(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = urllib.parse.unquote(parsed.path)
        if re.search(r'/+index\.html$', path):
            self.send_response(301)
            self.send_header('Location', '/' + ('?' + parsed.query if parsed.query else ''))
            self.end_headers()
            return
        local = self.translate_path(path)
        if os.path.isdir(local):
            local = os.path.join(local, 'index.html')
        if any(rx.search(path) for rx in BLOCKED) or not os.path.isfile(local):
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self._apply_headers('404.html')
            self.end_headers()
            return
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(local))
        self._apply_headers(os.path.basename(local))
        self.end_headers()

    def _send_404(self):
        page = os.path.join(ROOT, '404.html')
        data = open(page, 'rb').read() if os.path.isfile(page) else b'404 Not Found'
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self._apply_headers('404.html')
        self.end_headers()
        self.wfile.write(data)

    # Types MIME utiles (AddType du .htaccess)
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
        '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
        '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8',
    }


if __name__ == '__main__':
    parse_htaccess(os.path.join(ROOT, '.htaccess'))
    print('Serveur de test : http://127.0.0.1:%d/  (racine %s)' % (PORT, ROOT))
    print('%d en-têtes globaux, %d par extension, %d motifs bloqués' % (len(GLOBAL_HEADERS), len(MATCH_HEADERS), len(BLOCKED)))
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
