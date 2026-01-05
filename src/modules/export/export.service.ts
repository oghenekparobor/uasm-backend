import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth-user.type';

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'xlsx',
  PDF = 'pdf',
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export members to CSV/Excel/PDF
   */
  async exportMembers(
    format: ExportFormat,
    res: Response,
    user?: AuthenticatedUser,
    filters?: any,
  ) {
    // Fetch members with RLS
    const members = await this.prisma.withRLSContext(user || null, async (tx) => {
      return tx.member.findMany({
        where: filters,
        include: {
          currentClass: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    const columns = [
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'birthday', header: 'Birthday' },
      { key: 'phone', header: 'Phone' },
      { key: 'email', header: 'Email' },
      { key: 'address', header: 'Address' },
      { key: 'emergencyContact', header: 'Emergency Contact' },
      { key: 'currentClass', header: 'Current Class' },
      { key: 'createdAt', header: 'Created At' },
    ];

    const data = members.map((member) => ({
      firstName: member.firstName,
      lastName: member.lastName,
      birthday: member.birthday ? new Date(member.birthday).toLocaleDateString() : '',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      emergencyContact: member.emergencyContact || '',
      currentClass: member.currentClass?.name || 'No Class',
      createdAt: new Date(member.createdAt).toLocaleDateString(),
    }));

    await this.exportData(format, res, data, columns, 'members');
  }

  /**
   * Export attendance records to CSV/Excel/PDF
   */
  async exportAttendance(
    format: ExportFormat,
    res: Response,
    user?: AuthenticatedUser,
    filters?: any,
  ) {
    const records = await this.prisma.memberAttendance.findMany({
      where: filters,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
            type: true,
          },
        },
        attendanceWindow: {
          select: {
            sundayDate: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        markedAt: 'desc',
      },
    });

    const columns = [
      { key: 'member', header: 'Member' },
      { key: 'class', header: 'Class' },
      { key: 'status', header: 'Status' },
      { key: 'sundayDate', header: 'Sunday Date' },
      { key: 'markedBy', header: 'Marked By' },
      { key: 'markedAt', header: 'Marked At' },
      { key: 'notes', header: 'Notes' },
    ];

    const data = records.map((record) => ({
      member: `${record.member.firstName} ${record.member.lastName}`,
      class: record.class.name,
      status: record.status,
      sundayDate: new Date(record.attendanceWindow.sundayDate).toLocaleDateString(),
      markedBy: `${record.user.firstName} ${record.user.lastName}`,
      markedAt: new Date(record.markedAt).toLocaleDateString(),
      notes: record.notes || '',
    }));

    await this.exportData(format, res, data, columns, 'attendance');
  }

  /**
   * Export distribution records to CSV/Excel/PDF
   */
  async exportDistribution(
    format: ExportFormat,
    res: Response,
    user?: AuthenticatedUser,
    filters?: any,
  ) {
    const batches = await this.prisma.distributionBatch.findMany({
      where: filters,
      include: {
        attendanceWindow: {
          select: {
            sundayDate: true,
          },
        },
        classDistributions: {
          include: {
            class: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });

    // Flatten distribution data
    const data: any[] = [];
    batches.forEach((batch) => {
      if (batch.classDistributions.length === 0) {
        data.push({
          batchId: batch.id,
          sundayDate: new Date(batch.attendanceWindow.sundayDate).toLocaleDateString(),
          className: 'N/A',
          classType: 'N/A',
          foodAllocated: 0,
          waterAllocated: 0,
          foodReceived: batch.totalFoodReceived,
          waterReceived: batch.totalWaterReceived,
          confirmedBy: `${batch.user.firstName} ${batch.user.lastName}`,
          confirmedAt: new Date(batch.confirmedAt).toLocaleDateString(),
        });
      } else {
        batch.classDistributions.forEach((dist) => {
          data.push({
            batchId: batch.id,
            sundayDate: new Date(batch.attendanceWindow.sundayDate).toLocaleDateString(),
            className: dist.class.name,
            classType: dist.class.type,
            foodAllocated: dist.foodAllocated,
            waterAllocated: dist.waterAllocated,
            foodReceived: batch.totalFoodReceived,
            waterReceived: batch.totalWaterReceived,
            confirmedBy: `${batch.user.firstName} ${batch.user.lastName}`,
            confirmedAt: new Date(batch.confirmedAt).toLocaleDateString(),
          });
        });
      }
    });

    const columns = [
      { key: 'batchId', header: 'Batch ID' },
      { key: 'sundayDate', header: 'Sunday Date' },
      { key: 'className', header: 'Class Name' },
      { key: 'classType', header: 'Class Type' },
      { key: 'foodAllocated', header: 'Food Allocated' },
      { key: 'waterAllocated', header: 'Water Allocated' },
      { key: 'foodReceived', header: 'Food Received' },
      { key: 'waterReceived', header: 'Water Received' },
      { key: 'confirmedBy', header: 'Confirmed By' },
      { key: 'confirmedAt', header: 'Confirmed At' },
    ];

    await this.exportData(format, res, data, columns, 'distribution');
  }

  /**
   * Export activity logs to CSV/Excel/PDF
   */
  async exportActivityLogs(
    format: ExportFormat,
    res: Response,
    user?: AuthenticatedUser,
    filters?: any,
  ) {
    const logs = await this.prisma.activityLog.findMany({
      where: filters,
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10000, // Limit to prevent memory issues
    });

    const columns = [
      { key: 'action', header: 'Action' },
      { key: 'entityType', header: 'Entity Type' },
      { key: 'entityId', header: 'Entity ID' },
      { key: 'metadata', header: 'Metadata' },
      { key: 'actor', header: 'Actor' },
      { key: 'createdAt', header: 'Created At' },
    ];

    const data = logs.map((log) => ({
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || '',
      metadata: log.metadata ? JSON.stringify(log.metadata) : '',
      actor: `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})`,
      createdAt: new Date(log.createdAt).toLocaleString(),
    }));

    await this.exportData(format, res, data, columns, 'activity-logs');
  }

  /**
   * Export empowerment requests to CSV/Excel/PDF
   */
  async exportEmpowermentRequests(
    format: ExportFormat,
    res: Response,
    user?: AuthenticatedUser,
    filters?: any,
  ) {
    const requests = await this.prisma.empowermentRequest.findMany({
      where: filters,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        requester: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const columns = [
      { key: 'member', header: 'Member' },
      { key: 'type', header: 'Type' },
      { key: 'description', header: 'Description' },
      { key: 'status', header: 'Status' },
      { key: 'requestedBy', header: 'Requested By' },
      { key: 'approvedBy', header: 'Approved By' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'approvedAt', header: 'Approved At' },
    ];

    const data = requests.map((req) => ({
      member: `${req.member.firstName} ${req.member.lastName}`,
      type: req.type,
      description: req.description || '',
      status: req.status,
      requestedBy: `${req.requester.firstName} ${req.requester.lastName}`,
      approvedBy: req.approver ? `${req.approver.firstName} ${req.approver.lastName}` : '',
      createdAt: new Date(req.createdAt).toLocaleString(),
      approvedAt: req.approvedAt ? new Date(req.approvedAt).toLocaleString() : '',
    }));

    await this.exportData(format, res, data, columns, 'empowerment-requests');
  }

  /**
   * Generic export method that handles CSV, Excel, and PDF
   */
  private async exportData(
    format: ExportFormat,
    res: Response,
    data: any[],
    columns: Array<{ key: string; header: string }>,
    filename: string,
  ) {
    switch (format) {
      case ExportFormat.CSV:
        await this.exportToCSV(res, data, columns, filename);
        break;
      case ExportFormat.EXCEL:
        await this.exportToExcel(res, data, columns, filename);
        break;
      case ExportFormat.PDF:
        await this.exportToPDF(res, data, columns, filename);
        break;
    }
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(
    res: Response,
    data: any[],
    columns: Array<{ key: string; header: string }>,
    filename: string,
  ) {
    // Create CSV header
    const headers = columns.map((col) => this.escapeCSV(col.header)).join(',');
    
    // Create CSV rows
    const rows = data.map((item) =>
      columns
        .map((col) => this.escapeCSV(String(item[col.key] || '')))
        .join(',')
    );

    // Combine header and rows
    const csvContent = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 support
  }

  /**
   * Export to Excel
   */
  private async exportToExcel(
    res: Response,
    data: any[],
    columns: Array<{ key: string; header: string }>,
    filename: string,
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    // Add headers
    worksheet.addRow(columns.map((col) => col.header));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((item) => {
      worksheet.addRow(columns.map((col) => item[col.key] || ''));
    });

    // Auto-fit columns
    columns.forEach((_, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = 15;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(
    res: Response,
    data: any[],
    columns: Array<{ key: string; header: string }>,
    filename: string,
  ) {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Export Report', { align: 'center' });
    doc.moveDown();

    // Table headers
    const tableTop = doc.y;
    const rowHeight = 20;
    const colWidths = columns.map(() => 100);
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

    // Draw header row
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    columns.forEach((col, index) => {
      doc.text(col.header, x, tableTop, { width: colWidths[index], align: 'left' });
      x += colWidths[index];
    });

    // Draw data rows
    doc.font('Helvetica');
    let y = tableTop + rowHeight;
    data.slice(0, 100).forEach((item) => { // Limit to 100 rows for PDF
      x = 50;
      columns.forEach((col, index) => {
        const text = String(item[col.key] || '').substring(0, 30); // Truncate long text
        doc.text(text, x, y, { width: colWidths[index], align: 'left' });
        x += colWidths[index];
      });
      y += rowHeight;

      // Add new page if needed
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

