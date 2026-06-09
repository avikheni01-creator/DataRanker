import React, { useState, useCallback } from 'react';
import './ColumnMapper.css';

/**
 * ColumnMapper Component
 * Handles manual mapping of data file columns to KPI metrics
 * 
 * Workflow:
 * 1. User uploads CSV/Excel file
 * 2. Component extracts available columns from file
 * 3. User maps each KPI metric to a data column via dropdown
 * 4. Sends mapped configuration to backend
 */

const ColumnMapper = ({ onMappingComplete, kpiMetrics = [] }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileDataPreview, setFileDataPreview] = useState([]);

  /**
   * Handle file upload
   * Extracts columns from CSV/Excel and sets up initial state
   */
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const columns = await extractColumnsFromFile(file);
      setUploadedFile(file);
      setAvailableColumns(columns);
      
      // Initialize mapping state with empty values
      const initialMapping = {};
      kpiMetrics.forEach(metric => {
        initialMapping[metric.id] = '';
      });
      setColumnMapping(initialMapping);

      // Get preview data
      const preview = await getFilePreview(file);
      setFileDataPreview(preview);
    } catch (err) {
      setError(`Error processing file: ${err.message}`);
      console.error('File processing error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [kpiMetrics]);

  /**
   * Extract columns from CSV or Excel file
   */
  const extractColumnsFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      return await extractColumnsFromCSV(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      return await extractColumnsFromExcel(file);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel file.');
    }
  };

  /**
   * Extract columns from CSV file
   */
  const extractColumnsFromCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          resolve(headers.filter(h => h.length > 0));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  /**
   * Extract columns from Excel file
   * Note: Requires xlsx library - add to package.json
   */
  const extractColumnsFromExcel = async (file) => {
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }
      
      return Object.keys(data[0]);
    } catch (err) {
      throw new Error(`Failed to read Excel file: ${err.message}`);
    }
  };

  /**
   * Get preview of file data (first 3 rows)
   */
  const getFilePreview = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'csv') {
      return await getCSVPreview(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      return await getExcelPreview(file);
    }
    return [];
  };

  const getCSVPreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').slice(0, 4);
          resolve(lines);
        } catch {
          resolve([]);
        }
      };
      reader.readAsText(file);
    });
  };

  const getExcelPreview = async (file) => {
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(worksheet);
      return data.slice(0, 3);
    } catch {
      return [];
    }
  };

  /**
   * Handle mapping change for a specific metric
   */
  const handleMappingChange = (metricId, columnName) => {
    setColumnMapping(prev => ({
      ...prev,
      [metricId]: columnName
    }));
  };

  /**
   * Validate that all metrics are mapped
   */
  const validateMapping = () => {
    const unmappedMetrics = kpiMetrics.filter(metric => !columnMapping[metric.id]);
    
    if (unmappedMetrics.length > 0) {
      setError(
        `Please map the following metrics: ${unmappedMetrics.map(m => m.name).join(', ')}`
      );
      return false;
    }
    return true;
  };

  /**
   * Submit mapping configuration to parent/backend
   */
  const handleSubmitMapping = async () => {
    if (!validateMapping()) return;

    setIsLoading(true);
    try {
      const mappingConfig = {
        fileName: uploadedFile.name,
        timestamp: new Date().toISOString(),
        mappings: kpiMetrics.map(metric => ({
          metricId: metric.id,
          metricName: metric.name,
          mappedColumn: columnMapping[metric.id],
          dataType: metric.dataType || 'number'
        }))
      };

      // Send to backend
      await sendMappingToBackend(mappingConfig);
      
      // Notify parent component
      onMappingComplete(mappingConfig);
    } catch (err) {
      setError(`Error submitting mapping: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send mapping configuration to backend API
   */
  const sendMappingToBackend = async (mappingConfig) => {
    const response = await fetch('/api/kpi/column-mapping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappingConfig)
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
  };

  /**
   * Reset all mappings
   */
  const handleReset = () => {
    setUploadedFile(null);
    setAvailableColumns([]);
    setColumnMapping({});
    setFileDataPreview([]);
    setError(null);
  };

  return (
    <div className="column-mapper">
      <h2>Manual Column Mapping</h2>
      
      {/* File Upload Section */}
      <div className="mapper-section">
        <h3>Step 1: Upload Data File</h3>
        <div className="file-upload-area">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isLoading}
            id="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            {uploadedFile ? uploadedFile.name : 'Choose CSV or Excel file'}
          </label>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* File Preview */}
      {fileDataPreview.length > 0 && (
        <div className="mapper-section">
          <h3>File Preview</h3>
          <div className="preview-container">
            {Array.isArray(fileDataPreview[0]) ? (
              <table className="preview-table">
                <tbody>
                  {fileDataPreview.map((row, idx) => (
                    <tr key={idx}>
                      {row.split(',').map((cell, cellIdx) => (
                        <td key={cellIdx}>{cell.trim()}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="preview-table">
                <thead>
                  <tr>
                    {Object.keys(fileDataPreview[0] || {}).map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fileDataPreview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((cell, cellIdx) => (
                        <td key={cellIdx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Column Mapping Section */}
      {availableColumns.length > 0 && (
        <div className="mapper-section">
          <h3>Step 2: Map Columns to KPI Metrics</h3>
          <p className="instruction">
            Select the data column for each KPI metric
          </p>
          
          <div className="mapping-grid">
            {kpiMetrics.map(metric => (
              <div key={metric.id} className="mapping-row">
                <label className="metric-label">
                  {metric.name}
                  <span className="metric-type">({metric.dataType || 'number'})</span>
                </label>
                <select
                  value={columnMapping[metric.id] || ''}
                  onChange={(e) => handleMappingChange(metric.id, e.target.value)}
                  className={`column-select ${columnMapping[metric.id] ? 'mapped' : 'unmapped'}`}
                >
                  <option value="">-- Select Column --</option>
                  {availableColumns.map(column => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {availableColumns.length > 0 && (
        <div className="mapper-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmitMapping}
            disabled={isLoading || availableColumns.length === 0}
          >
            {isLoading ? 'Processing...' : 'Confirm Mapping'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default ColumnMapper;
