import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert, SafeAreaView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../services/DatabaseService';
import { fetchFiles, fetchStorageQuota, uploadFile, downloadFile, trashFile, DriveFile, StorageQuota } from '../services/DriveService';

interface ExtendedDriveFile extends DriveFile {
  accessToken: string;
  accountEmail: string;
}

export default function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [files, setFiles] = useState<ExtendedDriveFile[]>([]);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const db = getDb();
      const userAccounts: any[] = await db.getAllAsync('SELECT * FROM accounts');
      
      if (userAccounts.length > 0) {
        setAccounts(userAccounts);
        
        let totalFiles: ExtendedDriveFile[] = [];
        let totalLimit = 0;
        let totalUsage = 0;
        let totalUsageInDrive = 0;
        let totalUsageInDriveTrash = 0;

        for (const account of userAccounts) {
          try {
            const [filesData, quotaData] = await Promise.all([
              fetchFiles(account.access_token),
              fetchStorageQuota(account.access_token)
            ]);
            
            const extendedFiles = filesData.map(f => ({
              ...f, 
              accessToken: account.access_token,
              accountEmail: account.email
            }));
            
            totalFiles = [...totalFiles, ...extendedFiles];
            totalLimit += quotaData.limit;
            totalUsage += quotaData.usage;
            totalUsageInDrive += quotaData.usageInDrive;
            totalUsageInDriveTrash += quotaData.usageInDriveTrash;
          } catch (e) {
            console.warn(`Failed to fetch data for ${account.email}`, e);
          }
        }
        
        // Sort files by modified time descending
        totalFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
        
        setFiles(totalFiles);
        setQuota({
          limit: totalLimit,
          usage: totalUsage,
          usageInDrive: totalUsageInDrive,
          usageInDriveTrash: totalUsageInDriveTrash
        });
      } else {
        onLogout();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileSize = file.size || 0;
        
        // Find an account with enough space
        let targetAccount = null;
        for (const account of accounts) {
           const quotaData = await fetchStorageQuota(account.access_token);
           if ((quotaData.limit - quotaData.usage) > fileSize) {
               targetAccount = account;
               break;
           }
        }
        
        if (!targetAccount) {
            Alert.alert('Storage Error', 'Not enough space in any connected account to upload this file.');
            return;
        }

        setUploading(true);
        await uploadFile(file.uri, file.name, file.mimeType || 'application/octet-stream', targetAccount.access_token);
        Alert.alert('Success', `File uploaded successfully to ${targetAccount.email}!`);
        await loadData(); // Refresh list
      }
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileAction = (file: ExtendedDriveFile) => {
    Alert.alert(
      'File Options',
      `What do you want to do with "${file.name}"?\n(Account: ${file.accountEmail})`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: async () => {
            try {
              Alert.alert('Downloading', 'Please wait...');
              await downloadFile(file.id, file.name, file.accessToken);
            } catch (error: any) {
              Alert.alert('Download Error', error.message);
            }
          }
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await trashFile(file.id, file.accessToken);
              Alert.alert('Success', 'Moved to trash');
              await loadData(); // Refresh list
            } catch (error: any) {
              Alert.alert('Delete Error', error.message);
            }
          }
        }
      ]
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStorageBar = () => {
    if (!quota || quota.limit === 0) return null;
    const percentage = (quota.usage / quota.limit) * 100;
    return (
      <View style={styles.quotaContainer}>
        <View style={styles.quotaTextRow}>
          <Text style={styles.quotaText}>Storage</Text>
          <Text style={styles.quotaText}>{formatBytes(quota.usage)} / {formatBytes(quota.limit)}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%` }]} />
        </View>
      </View>
    );
  };

  const renderFileItem = ({ item }: { item: ExtendedDriveFile }) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    return (
      <TouchableOpacity 
        style={styles.fileItem} 
        onLongPress={() => handleFileAction(item)}
        delayLongPress={400}
      >
        {item.thumbnailLink ? (
          <Image source={{ uri: item.thumbnailLink }} style={styles.fileIcon} />
        ) : (
          <View style={[styles.fileIcon, styles.placeholderIcon]}>
            <Text style={styles.placeholderIconText}>{isFolder ? '📁' : '📄'}</Text>
          </View>
        )}
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileDate}>{new Date(item.modifiedTime).toLocaleDateString()} • {item.accountEmail}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !uploading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#82AAFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>G Drive Connector</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
      
      {accounts.length > 0 && <Text style={styles.emailText}>{accounts.length} Account(s) Connected</Text>}
      {renderStorageBar()}

      <View style={styles.fileListHeader}>
        <Text style={styles.fileListTitle}>My Drive (Long press file for options)</Text>
      </View>

      <FlatList
        data={files}
        keyExtractor={(item) => item.id + item.accessToken}
        renderItem={renderFileItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={handleUpload} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fabText}>+</Text>
        )}
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    width: '100%',
    maxWidth: 800, // Tablet layout constraint
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#FF5370',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emailText: {
    color: '#A6ACCD',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quotaContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quotaTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quotaText: {
    color: '#A6ACCD',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#292D3E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#82AAFF',
  },
  fileListHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  fileListTitle: {
    color: '#A6ACCD',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80, // Padding for FAB
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292D3E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderIcon: {
    backgroundColor: '#3B4252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconText: {
    fontSize: 20,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileDate: {
    color: '#A6ACCD',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#82AAFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 30,
    color: '#1E1E2E',
    fontWeight: 'bold',
    marginTop: -2,
  },
});
