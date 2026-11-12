import { SectionIntro, Pressable, Text, TextInput } from '@/components/ui';
import { shop, layout, radius, space } from '@/constants/shop-theme';
import { authService } from '@/services/auth.service';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { EmptyState, LoadingState } from '@/components/shop-ui';
import { getApiMessage } from '@/utils/format';

type Address={ma_dia_chi:number;ho_ten:string;so_dien_thoai:string;dia_chi:string;mac_dinh:boolean};
type Notification={ma_thong_bao:number;noi_dung:string;ma_don_hang?:number;da_doc:boolean};
const blank={ho_ten:'',so_dien_thoai:'',dia_chi:'',mac_dinh:false};
export default function AccountToolsScreen(){
  const {section}=useLocalSearchParams<{section?:string}>();
  const key = section === 'password' ? 'password' : 'password';
  return <Tools key={key} section={key}/>;
}
function ToolsButton({label,action,disabled}:{label:string;action:()=>void;disabled:boolean}){return <Pressable disabled={disabled} style={styles.button} onPress={action}><Text style={styles.buttonText}>{label}</Text></Pressable>;}
function Tools({section}:{section:string}){
  const router=useRouter();
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [address,setAddress]=useState(blank),[editing,setEditing]=useState<number>();
  const [oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[notice,setNotice]=useState('');
  const lock=useRef(false);
  const load=useCallback(async()=>{
    try{if(section!=='password'){const r=await api.get(`/shop/${section}`);setRows(r.data.data || []);}setError('');}
    catch(e){setError(getApiMessage(e,'Chưa tải được dữ liệu.'));}finally{setLoading(false);}
  },[section]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const run=async(action:()=>Promise<unknown>)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
    try{await action();await load();}catch(e){setError(getApiMessage(e,'Chưa thể lưu thay đổi.'));}finally{lock.current=false;setBusy(false);}
  };
  if(loading)return <LoadingState message="Đang tải..."/>;
  return <SafeAreaView style={styles.safe} edges={['bottom']}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <SectionIntro title={{addresses:'Sổ địa chỉ',notifications:'Thông báo',password:'Đổi mật khẩu'}[section] || 'Tài khoản'} description="Quản lý thông tin và bảo vệ tài khoản mua sắm của bạn." />
    {error ? <EmptyState icon="error-outline" title="Chưa hoàn tất yêu cầu" message={error} action="Tải lại" onAction={load}/> : null}
    {notice ? <Text style={styles.text}>{notice}</Text> : null}
    {section==='notifications' && rows.map((n:Notification)=><View key={n.ma_thong_bao} style={styles.card}><Text style={[styles.text,{fontWeight:n.da_doc?'400':'800'}]}>{n.noi_dung}</Text>{<ToolsButton label={n.da_doc?'Xem chi tiết':'Đọc thông báo'} action={()=>void run(async()=>{await api.put(`/shop/notifications/${n.ma_thong_bao}/read`);if(n.ma_don_hang)router.push({pathname:'/order/[id]',params:{id:String(n.ma_don_hang)}});else router.push('/contact-history');})} disabled={busy} />}</View>)}
    {section==='addresses' && <>
      {rows.map((a:Address)=><View key={a.ma_dia_chi} style={styles.card}><Text style={styles.text}>{a.ho_ten} · {a.so_dien_thoai}{a.mac_dinh?' · Mặc định':''}</Text><Text style={styles.text}>{a.dia_chi}</Text>{<ToolsButton label={'Sửa'} action={()=>{setAddress(a);setEditing(a.ma_dia_chi);}} disabled={busy} />}{<ToolsButton label={'Xóa'} action={()=>void run(()=>api.delete(`/shop/addresses/${a.ma_dia_chi}`))} disabled={busy} />}</View>)}
      <View style={styles.card}><Text style={styles.text}>{editing?'Sửa địa chỉ':'Thêm địa chỉ'}</Text>
        <TextInput accessibilityLabel="Họ tên người nhận" placeholder="Họ tên người nhận" value={address.ho_ten} onChangeText={ho_ten=>setAddress(a=>({...a,ho_ten}))} maxLength={100} style={styles.input}/>
        <TextInput accessibilityLabel="Số điện thoại" placeholder="Số điện thoại" keyboardType="phone-pad" value={address.so_dien_thoai} onChangeText={so_dien_thoai=>setAddress(a=>({...a,so_dien_thoai}))} maxLength={15} style={styles.input}/>
        <TextInput accessibilityLabel="Địa chỉ" placeholder="Địa chỉ đầy đủ" value={address.dia_chi} onChangeText={dia_chi=>setAddress(a=>({...a,dia_chi}))} multiline maxLength={255} style={styles.input}/>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:Boolean(address.mac_dinh)}} onPress={()=>setAddress(a=>({...a,mac_dinh:!a.mac_dinh}))}><Text style={styles.text}>{address.mac_dinh?'☑':'☐'} Đặt làm mặc định</Text></Pressable>
        {<ToolsButton label={'Lưu địa chỉ'} action={()=>void run(async()=>{if(editing)await api.put(`/shop/addresses/${editing}`,address);else await api.post('/shop/addresses',address);setAddress(blank);setEditing(undefined);})} disabled={busy} />}
        {editing ? <ToolsButton label={'Hủy sửa'} action={()=>{setAddress(blank);setEditing(undefined);}} disabled={busy} /> : null}
      </View></>}
    {section==='password' && <View style={styles.card}>
      <TextInput accessibilityLabel="Mật khẩu hiện tại" placeholder="Mật khẩu hiện tại" secureTextEntry value={oldPassword} onChangeText={setOldPassword} style={styles.input}/>
      <TextInput accessibilityLabel="Mật khẩu mới" placeholder="Mật khẩu mới (8–72 ký tự)" secureTextEntry value={newPassword} onChangeText={setNewPassword} style={styles.input}/>
      <TextInput accessibilityLabel="Nhập lại mật khẩu" placeholder="Nhập lại mật khẩu" secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.input}/>
      {<ToolsButton label={'Đổi mật khẩu'} action={()=>{if(newPassword!==confirm){setError('Mật khẩu nhập lại không khớp.');return;}void run(async()=>{await api.put('/auth/password',{mat_khau_cu:oldPassword,mat_khau_moi:newPassword});setOldPassword('');setNewPassword('');setConfirm('');await authService.logout();router.replace('/(auth)/login');});}} disabled={busy} />}
    </View>}
    {!rows.length && section!=='password' && !error ? <Text style={styles.text}>Chưa có dữ liệu.</Text> : null}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:shop.background},content:{padding: layout.gutter,gap: space.md,maxWidth: layout.maxWidth,width:'100%',alignSelf:'center'},title:{fontSize:24,fontWeight: '700',color:shop.ink},card:{padding: layout.gutter,borderRadius: radius.md,backgroundColor:shop.surface,gap: space.md},text:{color:shop.ink,lineHeight:22},input:{padding:12,borderWidth:1,borderColor:shop.border,borderRadius:12,color:shop.ink},button:{padding:12,backgroundColor:shop.primary,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700'}});
