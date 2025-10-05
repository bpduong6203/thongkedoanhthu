import { useState, useEffect } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PlusCircle, Trash2, Download, RefreshCw, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const SUPABASE_URL = 'https://lfpglsccsdmykvdlcqii.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmcGdsc2Njc2RteWt2ZGxjcWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MjU0MDksImV4cCI6MjA3NTIwMTQwOX0.PqmXl0-mSm4S8BQdS_vnsPftjB5yK131Ocwc7H9EJv8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DISHES = {
  'Bánh Xèo': [30000, 25000],
  'Bánh Khọt': [35000],
  'Gỏi Cuốn': [6000],
  'Trứng Vịt Lộn': [8000],
  'Bột Chiên': [20000, 25000, 30000]
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState('Bánh Xèo');
  const [selectedPrice, setSelectedPrice] = useState(30000);
  const [quantity, setQuantity] = useState(1);
  const [createdBy, setCreatedBy] = useState('Nhân viên');
  const [dateRange, setDateRange] = useState('7'); // 7 ngày gần nhất

  const fetchTransactions = async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('transactions_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const handleAddTransaction = async () => {
    try {
      const total = selectedPrice * quantity;
      const { error } = await supabase
        .from('transactions')
        .insert([{
          dish_name: selectedDish,
          price: selectedPrice,
          quantity: quantity,
          total: total,
          created_by: createdBy
        }]);
      
      if (error) throw error;
      setQuantity(1);
      alert('✅ Đã thêm giao dịch thành công!');
    } catch (err) {
      alert('❌ Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa giao dịch này?')) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      alert('❌ Lỗi xóa: ' + err.message);
    }
  };

  // Thống kê theo ngày
  const getDailyStatistics = () => {
    const dailyStats = {};
    let totalRevenue = 0;

    transactions.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('vi-VN');
      if (!dailyStats[date]) {
        dailyStats[date] = { revenue: 0, count: 0 };
      }
      dailyStats[date].revenue += t.total;
      dailyStats[date].count += 1;
      totalRevenue += t.total;
    });

    return { dailyStats, totalRevenue };
  };

  // Thống kê theo món (hôm nay)
  const getTodayDishStats = () => {
    const today = new Date().toLocaleDateString('vi-VN');
    const stats = {};
    
    transactions
      .filter(t => new Date(t.created_at).toLocaleDateString('vi-VN') === today)
      .forEach(t => {
        if (!stats[t.dish_name]) {
          stats[t.dish_name] = { quantity: 0, revenue: 0 };
        }
        stats[t.dish_name].quantity += t.quantity;
        stats[t.dish_name].revenue += t.total;
      });

    return stats;
  };

  const handleExport = () => {
    const csv = [
      ['Thời gian', 'Món ăn', 'Giá', 'Số lượng', 'Thành tiền', 'Người nhập'],
      ...transactions.map(t => [
        new Date(t.created_at).toLocaleString('vi-VN'),
        t.dish_name,
        t.price,
        t.quantity,
        t.total,
        t.created_by
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `doanh-thu-${new Date().toLocaleDateString('vi-VN')}.csv`;
    link.click();
  };

  const { dailyStats, totalRevenue } = getDailyStatistics();
  const dishStats = getTodayDishStats();

  // Dữ liệu biểu đồ theo ngày
  const dailyChartData = Object.entries(dailyStats)
    .map(([date, data]) => ({
      name: date,
      'Doanh thu': data.revenue,
      'Số giao dịch': data.count
    }))
    .reverse(); // Sắp xếp từ cũ đến mới

  // Doanh thu hôm nay
  const today = new Date().toLocaleDateString('vi-VN');
  const todayRevenue = dailyStats[today]?.revenue || 0;
  const todayCount = dailyStats[today]?.count || 0;

  useEffect(() => {
    setSelectedPrice(DISHES[selectedDish][0]);
  }, [selectedDish]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🍲 Quản Lý Bán Hàng</h1>
              <p className="text-gray-600">Ngày: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="1">Hôm nay</option>
                <option value="7">7 ngày qua</option>
                <option value="30">30 ngày qua</option>
                <option value="90">3 tháng qua</option>
              </select>
              <button
                onClick={fetchTransactions}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Làm mới
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-5 h-5" />
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form nhập liệu */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-blue-600" />
                Thêm Giao Dịch
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Món ăn</label>
                  <select
                    value={selectedDish}
                    onChange={(e) => setSelectedDish(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {Object.keys(DISHES).map(dish => (
                      <option key={dish} value={dish}>{dish}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Giá bán</label>
                  <select
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {DISHES[selectedDish].map(price => (
                      <option key={price} value={price}>
                        {price.toLocaleString('vi-VN')} đ
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Người nhập</label>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Tên nhân viên"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Thành tiền:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(selectedPrice * quantity).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddTransaction}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
                >
                  ✅ Thêm Giao Dịch
                </button>
              </div>
            </div>
          </div>

          {/* Thống kê và biểu đồ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tổng doanh thu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg opacity-90 mb-1">Doanh Thu Hôm Nay</p>
                    <p className="text-3xl font-bold">{todayRevenue.toLocaleString('vi-VN')} đ</p>
                    <p className="text-sm opacity-80 mt-2">{todayCount} giao dịch</p>
                  </div>
                  <DollarSign className="w-16 h-16 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg opacity-90 mb-1">Tổng {dateRange} Ngày</p>
                    <p className="text-3xl font-bold">{totalRevenue.toLocaleString('vi-VN')} đ</p>
                    <p className="text-sm opacity-80 mt-2">{transactions.length} giao dịch</p>
                  </div>
                  <Calendar className="w-16 h-16 opacity-50" />
                </div>
              </div>
            </div>

            {/* Biểu đồ doanh thu theo ngày */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                📊 Doanh Thu Theo Ngày
              </h2>
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => value.toLocaleString('vi-VN') + ' đ'} />
                    <Legend />
                    <Bar dataKey="Doanh thu" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">Chưa có dữ liệu</p>
              )}
            </div>

            {/* Thống kê món hôm nay */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Thống Kê Món Hôm Nay</h2>
              {Object.keys(dishStats).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(dishStats).map(([dish, data]) => (
                    <div key={dish} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-100">
                      <h3 className="font-bold text-gray-800 mb-2">{dish}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">Số lượng: <span className="font-semibold text-blue-600">{data.quantity}</span></p>
                        <p className="text-gray-600">Doanh thu: <span className="font-semibold text-green-600">{data.revenue.toLocaleString('vi-VN')} đ</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">Chưa có giao dịch hôm nay</p>
              )}
            </div>

            {/* Bảng giao dịch chi tiết */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Chi Tiết Giao Dịch</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Giờ</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Món</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Giá</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SL</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thành tiền</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Người nhập</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(t.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t.dish_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.price.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.quantity}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">{t.total.toLocaleString('vi-VN')} đ</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.created_by}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Chưa có giao dịch nào</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;