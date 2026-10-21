<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RestablecerPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombre,
        public string $urlRestablecimiento
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Restablecer contraseña - Policlínica Ahuachapaneca',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.restablecer_password',
            with: [
                'nombre' => $this->nombre,
                'urlRestablecimiento' => $this->urlRestablecimiento,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
