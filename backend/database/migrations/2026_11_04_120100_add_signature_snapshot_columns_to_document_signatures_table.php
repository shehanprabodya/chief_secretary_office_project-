<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_signatures', function (Blueprint $table) {
            if (!Schema::hasColumn('document_signatures', 'signer_name_snapshot')) {
                $table->string('signer_name_snapshot', 255)->nullable()->after('document_reference');
            }

            if (!Schema::hasColumn('document_signatures', 'signer_designation_snapshot')) {
                $table->string('signer_designation_snapshot', 255)->nullable()->after('signer_name_snapshot');
            }

            if (!Schema::hasColumn('document_signatures', 'signer_office_snapshot')) {
                $table->string('signer_office_snapshot', 255)->nullable()->after('signer_designation_snapshot');
            }

            if (!Schema::hasColumn('document_signatures', 'signed_pdf_sha256')) {
                $table->string('signed_pdf_sha256', 64)->nullable()->after('signed_pdf_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_signatures', function (Blueprint $table) {
            if (Schema::hasColumn('document_signatures', 'signed_pdf_sha256')) {
                $table->dropColumn('signed_pdf_sha256');
            }

            if (Schema::hasColumn('document_signatures', 'signer_office_snapshot')) {
                $table->dropColumn('signer_office_snapshot');
            }

            if (Schema::hasColumn('document_signatures', 'signer_designation_snapshot')) {
                $table->dropColumn('signer_designation_snapshot');
            }

            if (Schema::hasColumn('document_signatures', 'signer_name_snapshot')) {
                $table->dropColumn('signer_name_snapshot');
            }
        });
    }
};
